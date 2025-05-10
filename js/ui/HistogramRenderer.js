// Calculates histogram bin data and renders the histogram display.

const HistogramRenderer = {

    // Calculates histogram data (bins and frequencies)
    _calculateHistogramData: function(samples) {
        if (!samples || samples.length === 0) {
            return [];
        }
        // Ensure samples are sorted for consistent min/max and binning
        const sortedSamples = [...samples].sort((a, b) => a - b);

        const minVal = sortedSamples[0];
        const maxVal = sortedSamples[sortedSamples.length - 1];
        let histogramData = [];
        const numSamples = sortedSamples.length;

        if (numSamples > 0) {
            if (minVal === maxVal) { // All samples are the same
                histogramData = [{ x0: minVal, x1: maxVal, frequency: numSamples }];
            } else {
                // Use Terrell-Scott's rule for number of bins, obtained from Config
                const numBins = Config.getHistogramBinCount();
                const binWidth = (maxVal - minVal) / numBins;

                // Initialize bins
                for (let i = 0; i < numBins; i++) {
                    histogramData.push({
                        x0: minVal + i * binWidth,
                        x1: minVal + (i + 1) * binWidth,
                        frequency: 0
                    });
                }

                // Populate bins
                for (const val of sortedSamples) {
                    let binIndex = Math.floor((val - minVal) / binWidth);
                    if (val === maxVal) { // Handle edge case where val === maxVal
                        binIndex = numBins - 1;
                    }
                    binIndex = Math.max(0, Math.min(binIndex, numBins - 1)); // Clamp
                    
                    if (histogramData[binIndex]) {
                        histogramData[binIndex].frequency++;
                    }
                }
            }
        }
        return histogramData;
    },

    // Renders the visual histogram (moved from old Renderer._renderHistogram)
    renderHistogramDisplay: function(samples, isFullWidth) {
        const container = document.createElement('div');
        container.classList.add('histogram-container'); // Style this class in cell-widget.css or histogram.css

        const histogramData = this._calculateHistogramData(samples);

        if (!histogramData || histogramData.length === 0) {
            return container; 
        }
        
        const validBins = histogramData.filter(bin => typeof bin.frequency === 'number' && bin.frequency >= 0 && typeof bin.x0 === 'number' && typeof bin.x1 === 'number');
        if (validBins.length === 0) {
            return container;
        }

        const maxFrequency = Math.max(...validBins.map(bin => bin.frequency), 0);

        if (maxFrequency === 0) {
            validBins.forEach(() => {
                const bar = document.createElement('div');
                bar.classList.add('histogram-bar'); // Style this class
                bar.style.height = '1%'; 
                container.appendChild(bar);
            });
            return container;
        }

        validBins.forEach(bin => {
            const bar = document.createElement('div');
            bar.classList.add('histogram-bar');
            const barHeight = (bin.frequency / maxFrequency) * 100;
            bar.style.height = `${Math.max(1, barHeight)}%`; 
            bar.title = `Range: ${bin.x0.toFixed(1)} to ${bin.x1.toFixed(1)}\nCount: ${bin.frequency}`;
            container.appendChild(bar);
        });

        return container;
    }
};

window.HistogramRenderer = HistogramRenderer; // Expose globally
console.log('js/ui/HistogramRenderer.js loaded');
