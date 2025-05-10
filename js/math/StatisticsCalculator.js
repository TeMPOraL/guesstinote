// Calculates basic statistics (mean, CI) from sample arrays.

const StatisticsCalculator = {
    calculateStats: function(samples) {
        if (!samples || samples.length === 0) {
            return { mean: null, ci: { lower: null, upper: null } }; // Histogram data removed
        }
        // Ensure samples are sorted for CI calculation (caller should sort if necessary, or do it here)
        // For now, assuming samples are sorted as per original Calculator.calculateStats behavior
        // If not, add: samples.sort((a, b) => a - b);

        const sum = samples.reduce((acc, val) => acc + val, 0);
        const mean = sum / samples.length;

        const lowerIndex = Math.floor(samples.length * 0.05); // 5th percentile
        const upperIndex = Math.ceil(samples.length * 0.95) -1; // 95th percentile

        const ci = {
            lower: samples[lowerIndex],
            upper: samples[upperIndex]
        };
        
        // Histogram data calculation is now handled by HistogramRenderer
        return { mean, ci };
    }
};

window.StatisticsCalculator = StatisticsCalculator; // Expose globally
console.log('js/math/StatisticsCalculator.js loaded');
