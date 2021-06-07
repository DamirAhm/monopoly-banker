// @ts-check
let mongoose = require('mongoose');

let playerSchema = new mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	money: {
		type: Number,
		default: 0,
		validate: {
			validator: (number) => {
				return +number >= 0;
			},
			message: 'Money can`t be negative',
		},
	},
	moves: {
		type: Array,
		default: [],
	},
	name: {
		type: String,
		required: true,
	},
	isPicked: {
		type: Boolean,
		default: false,
	},
	isGoing: {
		type: Boolean,
		default: false,
	},
	isLost: {
		type: Boolean,
		default: false,
	},
	gameId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'GameModel',
	},
	turnsBeforeNewCircle: {
		type: Number,
		default: 6,
		validator: {
			validate: (n) => n >= 0,
			message: 'Amt of turns can`t be negative',
		},
	},
});

module.exports.Player = mongoose.model('Player', playerSchema);
