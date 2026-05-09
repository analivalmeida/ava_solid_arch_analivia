const mongoose = require('../db/conn')
const { Schema } = mongoose

const Pet = mongoose.model(
    'Pet',
    new Schema(
        {
            name: {
                type: String,
                require: true
            },
            age: {
                type: Number,
                require: true
            },
            weight: {
                type: Number,
                require: true
            },
            color: {
                type: String,
                require: true
            },
            image: {
                type: Array,
                require: true
            },
            available: {
                type: Boolean,
                require: true
            },
            user: {
                type: Object,
                adopter: Object
            },
            adopter: {
                type: Object,
                required: false
            }
        },
        {
            timestamp: true
        }
    )
)

module.exports = Pet