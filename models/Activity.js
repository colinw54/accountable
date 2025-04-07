const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['work', 'personal', 'health', 'education', 'social', 'default'],
        default: 'default'
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Activity', activitySchema); 