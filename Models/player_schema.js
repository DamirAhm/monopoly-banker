let mongoose = require("mongoose");

let playerSchema = mongoose.Schema({
   _id: mongoose.Schema.Types.ObjectId,
   money: {
      type: Number,
      default: 0,
      validate: {
         validator: (number) => {
            return +number >= 0
         },
         message: "Money can`t be negative"
      }
   },
   moves: {
      type: Array,
      default: []
   },
   name: {
      type: String,
      required: true
   },
   isPicked: {
      type: Boolean,
      default: false
   },
   isGoing: {
      type: Boolean,
      default: false
   },
   gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameModel"
   }
});

module.exports = mongoose.model("Player", playerSchema);