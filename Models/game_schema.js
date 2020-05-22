// @ts-nocheck
let mongoose = require( "mongoose" );

let gameSchema = mongoose.Schema( {
    _id: mongoose.Schema.Types.ObjectId,
    players: {
        type: [ {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Player"
        } ],
        default: []
    },
    isStartSettingsDone: {
        type: Boolean,
        default: false
    },
    startSettings: {
        startMoney: {
            type: Number,
            validate: {
                validator: ( number ) => {
                    return +number >= 0
                },
                message: "Money can`t be negative"
            },
            default: 0
        },
        maxTime: {
            type: Number,
            validate: {
                validator: ( number ) => {
                    return +number >= 0
                },
                message: "Time can`t be negative"
            },
            default: 0
        },
        isMaxTimeOn: {
            type: Boolean,
            default: false
        },
        moneyForCircle: {
            type: Number,
            validate: {
                validator: ( number ) => {
                    return +number >= 0
                },
                message: "Money can`t be negative"
            },
            default: 0
        },
        bankerId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        minTurnsForCircle: {
            type: Number,
            validate: {
                validator: ( number ) => number >= 0,
                message: "Amt of turns can`t be negative"
            },
            default: 6
        }
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    isGameOver: {
        type: Boolean,
        default: false
    }
} );

module.exports = mongoose.model( "Game", gameSchema );