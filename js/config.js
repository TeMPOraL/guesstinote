// Stores and manages global settings.

const Config = (() => {
    let _globalSamples = 5000; // Default
    let _histogramBinCount = null; // Cached

    function calculateHistogramBinCount(numSamples) {
        if (numSamples <= 1) return 1; // For single value or no samples
        // Terrell-Scott's rule: ceil( (2 * N)^(1/3) )
        return Math.max(1, Math.ceil(Math.pow(2 * numSamples, 1/3)));
    }

    return {
        initialize: function() {
            // Initialize from Guesstinote global or UI if needed in future
            // For now, Guesstinote.getGlobalSamples will be the source of truth for _globalSamples
        },

        getGlobalSamples: function() {
            // This should be the single source of truth for the sample count.
            // It's currently fetched from the Guesstinote object, which reads from UI.
            if (window.Guesstinote && typeof window.Guesstinote.getGlobalSamples === 'function') {
                _globalSamples = window.Guesstinote.getGlobalSamples();
            }
            return _globalSamples;
        },

        // Call this when global samples count changes to update dependent configs
        updateGlobalSamples: function(newSampleCount) {
            _globalSamples = newSampleCount;
            _histogramBinCount = calculateHistogramBinCount(_globalSamples);
            // console.log(`Config: Global samples updated to ${newSampleCount}, histogram bins to ${_histogramBinCount}`);
        },

        getHistogramBinCount: function() {
            if (_histogramBinCount === null) { // Calculate on first request or if samples changed
                _histogramBinCount = calculateHistogramBinCount(this.getGlobalSamples());
            }
            return _histogramBinCount;
        }
    };
})();

window.Config = Config; // Expose globally
// Initialize Config when Guesstinote object is ready, or ensure Guesstinote calls Config.updateGlobalSamples
// For now, main.js's globalSamplesInput event listener should also call Config.updateGlobalSamples.
console.log('js/config.js loaded');
