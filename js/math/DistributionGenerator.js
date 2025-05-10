// Generates sample arrays for various statistical distributions.

const DistributionGenerator = {
    // FR3.3.3: PERT(min, most_likely, max, lambda=4), PERT(min, most_likely, max), PERT(min, max)
    generatePertSamples: function(min, mostLikely, max, lambda = 4) { // Lambda currently unused by triangular
        const samples = [];
        const numSamples = Config.getGlobalSamples(); // Use Config

        if (min > mostLikely || mostLikely > max || min > max) {
            console.error("Invalid PERT parameters for triangular: min <= mostLikely <= max not met.", {min, mostLikely, max});
            for (let i = 0; i < numSamples; i++) samples.push((min + mostLikely + max) / 3); // Fallback
            return samples.sort((a,b) => a-b);
        }
        if (min === max) {
             for (let i = 0; i < numSamples; i++) samples.push(min);
             return samples;
        }

        const fc = (mostLikely - min) / (max - min);
        for (let i = 0; i < numSamples; i++) {
            const rand = Math.random();
            let sample;
            if (rand < fc) {
                sample = min + Math.sqrt(rand * (max - min) * (mostLikely - min));
            } else {
                sample = max - Math.sqrt((1 - rand) * (max - min) * (max - mostLikely));
            }
            samples.push(sample);
        }
        return samples.sort((a, b) => a - b);
    },

    // FR3.3.4: Normal from 90% CI (value1 to value2)
    generateNormalSamplesFromCI: function(ciLower, ciUpper) {
        const samples = [];
        const numSamples = Config.getGlobalSamples(); // Use Config
        const mean = (ciLower + ciUpper) / 2;
        const stdDev = (ciUpper - mean) / 1.645; // Z-score for 90% CI

        for (let i = 0; i < numSamples; i++) {
            let u1 = Math.random();
            let u2 = Math.random();
            let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            samples.push(mean + stdDev * z0);
        }
        return samples.sort((a, b) => a - b);
    },

    // FR3.3.5: Upsample/downsample to global sample count
    processInlineDataArray: function(dataArray) {
        if (!dataArray || dataArray.length === 0) {
            return [];
        }
        const numSamples = Config.getGlobalSamples(); // Use Config
        if (dataArray.length === numSamples) {
            return [...dataArray].sort((a,b) => a-b);
        }
        const resampled = [];
        for (let i = 0; i < numSamples; i++) {
            resampled.push(dataArray[Math.floor(Math.random() * dataArray.length)]);
        }
        return resampled.sort((a, b) => a - b);
    }
};

window.DistributionGenerator = DistributionGenerator; // Expose globally
console.log('js/math/DistributionGenerator.js loaded');
