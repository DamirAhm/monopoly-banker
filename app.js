const express = require("express"),
    bodyParser = require("body-parser"),
    http = require("http"),
    expressWs = require("express-ws"),
    mongoose = require("mongoose"),
    Player = require("./Models/player_schema"),
    Game = require("./Models/game_schema");

mongoose.connect("mongodb+srv://banker666:8NHK9PFuv7bJmmIa@firstapp-x1lka.mongodb.net/test?retryWrites=true&w=majority", {useFindAndModify: false, useNewUrlParser: true}, err => {
    if (err) throw err;
    console.log("Successfully connected");
});

let connections = {};

let app = express();
app.use(bodyParser.json());
app.use("/public", express.static("public"));
app.set("view engine", "pug");
app.set("views", "./views");

let server = http.createServer(app);
let wss = expressWs(app, server);

let pickPlayer = (id) => {
    Player.findById(id, (err, player) => {
        if (err) {
            console.log("Error while finding player in pick-player");
            throw err;
        }
        if (player.isPicked) {
            return "Player is already picked";
        } else {
            player.isPicked = true;
            player.save(err => {
                if (err) {
                    console.log("Error while saving player in pick-player");
                    throw err;
                }
            });
        }
    });
};

let unpickPlayer = (id) => {
    Player.findById(id, (err, player) => {
        if (err) {
            console.log("Error while finding player in unpick player");
            throw err;
        }
        if (!player.isPicked) {
            return "Player isn`t picked";
        } else {
            player.isPicked = false;
            player.save(err => {
                if (err) {
                    console.log("Error while saving player in unpick player");
                    throw err;
                }
            });
        }
    });
};

app.get("/", (req, res) => {
    res.render("starterPage");
}); //return starterPage
app.post("/", (req, res) => {
    let newGame = new Game({
        _id: new mongoose.Types.ObjectId()
    });
    newGame.save(err => {
        if (err) {
            res.json({error: "Error while saving game"});
            throw err;
        }
        res.json(newGame._id);
    });
}); //create new room

app.get("/:gameId/starter-settings", (req, res) => {
    Game.findById(req.params.gameId, (err, game) => {
        if (err) {
            console.log("Error while finding the game in starter-settings");
            res.send("404 Game not found");
            throw err;
        }
        Player.find({gameId: game._id}, (err, players) => {
            players.sort((a, b) => game.players.indexOf(a._id) - game.players.indexOf(b._id));
            res.render("starterSettings", {
                players: players.length ? players : null,
                isStartSettingsDone: game.isStartSettingsDone,
                maxPlayers: players.length === 6,
                startSettings: game.startSettings
            });
        });
    });
}); //return game room starter settings
app.get("/:gameId/starter-settings/change-name/:_id", req => {
    Player.findByIdAndUpdate(req.params._id, {name: req.query.name}, err => {
        if (err) {
            console.log("Error while updating player in change name");
            throw err;
        }
    });
}); //change player name by _id
app.get("/:gameId/starter-settings/new-player", (req, res) => {
    Game.findById(req.params.gameId, (err, game) => {
        if (err) {
            console.log("Error while finding game in new player");
            throw err;
        }
        let newPlayer = new Player({
            _id: new mongoose.Types.ObjectId(),
            name: req.query.name,
            gameId: game._id
        });
        game.players.push(newPlayer._id);
        newPlayer.save(err => {
            if (err) {
                res.json({error: "Error while saving player in new player"});
                throw err;
            }
            res.send(newPlayer._id);
        });
        game.save(err => {
            if (err) throw err;
        });
    });
}); //create new player
app.get("/:gameId/starter-settings/delete-player", req => {
    Game.findById(req.params.gameId, (err, game) => {
        if (err) {
            console.log("Error while find game in delete player");
            throw err;
        }
        Player.findById(req.query.id, (err, player) => {
            if (err) {
                console.log("Error while finding player in delete ");
                throw err;
            }
            game.players.splice(game.players.indexOf(player._id), 1);
            game.save(err => {
                if (err) {
                    console.log("Error while saving game in delete");
                    throw err;
                }
            });
        });
        Player.findByIdAndDelete(req.query.id, err => {
            if (err) {
                console.log("Error while deleting player");
                throw err;
            }
        });
    });
}); //delete player by _id
app.post("/:gameId/starter-settings", (req, res) => {
    Game.findById(req.params.gameId, (err, game) => {
        if (err) {
            console.log("Error while finding the game in post starter-settings");
            throw err;
        }
        Player.find({gameId: game._id}, (err, players) => {
            if (err) {
                console.log("Error while finding players in post starter-settings");
                throw err;
            }
            for (let i = 0; i < players.length; i++) {
                players[i].money = req.body.startMoney;
                players[i].save(err => {
                    if (err) {
                        console.log("Error while saving player in post starter-settings");
                        throw err;
                    }
                });
            }
        });
        Player.findById(req.body.bankerId, (err, player) => {
            if (err) {
                console.log("Error while finding the player there");
                throw err;
            }
            game.startSettings = {
                ...req.body,
                bankerId: player._id
            };
            game.isStartSettingsDone = true;
            game.save(err => {
                if (err) {
                    console.log("Error while saving the game");
                    throw err;
                }
            });
            res.send();
        });
        Player.findByIdAndUpdate(game.players[0], {isGoing: true}, err => {
            if (err) {
                console.log("Error while updating ");
                throw err;
            }
        });
    });
});//Posts starter settings for game

app.get("/:gameId/players", (req, res) => {
    Game.findById(req.params.gameId, (err, game) => {
        if (err) {
            console.log("Error while finding game in players");
            throw err;
        }
        if (req.query.id) {
            Player.findById(req.query.id, (err, player) => {
                if (err) {
                    console.log("Error while finding game in players");
                    throw err;
                }
                res.json(player);
            });
        } else {
            Player.find({gameId: game._id}, (err, players) => {
                if (err) {
                    console.log("Error while finding game in players");
                    throw err;
                }
                if (players.length === game.players.length) {
                    players.sort((a, b) => game.players.indexOf(a._id) - game.players.indexOf(b._id));
                    res.json(players);
                } else {
                    res.json({error: "Error in players count"});
                    throw new Error("Error in players count");
                }
            });
        }
    });
}); //return game room players
app.get("/:gameId/movesLeft", (req, res) => {
    Game.findById(req.params.gameId, (err) => {
        if (err) {
            console.log("Error while finding the game in movesLeft");
            throw err;
        }
        if (req.query.playerId) {
            Player.findById(req.query.playerId, (err, player) => {
                if (err) {
                    console.log("Error while finding the player in movesLeft");
                    throw err;
                }
                res.send(player.moves.length.toString());
            });
        } else {
            res.json({error: "Player not Found"});
        }
    });
});
app.post("/:gameId/players/change-sequence", req => {
    Game.findById(req.params.gameId, (err, game) => {
        if (err) {
            console.log("Error while finding game in change sequence");
            throw err;
        }
        if (game.players.length === req.body.length) {
            let newPlayerList = [];
            let promise = new Promise((res, rej) => {
                for (let i = 0; i < req.body.length; i++) {
                    Player.findById(req.body[i].id, (err, player) => {
                        if (err) {
                            console.log("Error while finding player in change sequence");
                            throw err;
                        }
                        newPlayerList[i] = player._id;
                        if (i === req.body.length - 1) {
                            res(newPlayerList);
                        }
                    });
                }
            });
            promise.then(newPlayerList => {
                game.players = newPlayerList;
                game.save(err => {
                    if (err) {
                        console.log("Error while saving game in change sequence");
                        throw err;
                    }
                });
            });
        } else {
            throw new Error("Error in players count");
        }
    });
}); //change game room player sequence
app.get("/:gameId/pick-player", (req, res) => {
    Game.findById(req.params.gameId, (err, game) => {
        if (err) {
            console.log("Error while finding game in pick-player");
            throw err;
        }
        Player.findById(req.query.id, (err, player) => {
            if (err) {
                console.log("Error while finding player in pick-player");
                throw err;
            }
            if (player.isPicked) {
                res.json({error: "Player is already picked"});
            } else {
                player.isPicked = true;
                player.save(err => {
                    if (err) {
                        console.log("Error while saving player in pick-player");
                        throw err;
                    }
                });
            }
        });
    });
});//change isPicked parameter of player to true
app.get("/:gameId/unpick-player", (req, res) => {
    Game.findById(req.params.gameId, (err, game) => {
        if (err) {
            console.log("Error while finding game in unpick player");
            throw err;
        }
        let error = unpickPlayer(req.query.id);
        if (error) {
            res.json({error: error});
        }
    });
});//change isPicked parameter of player to false

app.get("/:gameId", (req, res) => {
    if (req.params.gameId !== "favicon.ico") {
        Game.findById(req.params.gameId, (err, game) => {
            if (err) {
                console.log("Error while finding the game in render game");
                throw err;
            }
            if (!req.query.playerId) {
                if (game.isStartSettingsDone) {
                    res.render("pickPlayersPage", {
                        allPicked: game.players.find(e => !e.isPicked) === undefined
                    });
                } else {
                    res.send("Confirm your starter settings");
                }
            } else {
                Player.findById(req.query.playerId, (err, player) => {
                    if (err) {
                        console.log("Error while finding the player in render game");
                        throw err;
                    }
                    let bankerId = game.startSettings.bankerId;
                    res.render("playerPage", {
                        user: player,
                        isBanker: player._id.toString() === bankerId.toString(),
                        gameId: player.gameId,
                        isGoing: player.isGoing,
                        moneyPerCircle: game.startSettings.moneyForCircle
                    });
                });
            }
        });
    }
});//return player pick page and player page
app.get("/:gameId/giveTurn", (req, res) => {
    Game.findById(req.params.gameId, (err, game) => {
        if (err) {
            console.log("Error while finding the game in give turn");
            throw err;
        }
        Player.findByIdAndUpdate(req.query.playerId, {isGoing: false}, (err, player) => {
            if (err) {
                console.log("Error while updating player in give turn");
                throw err;
            }
            if (game.players.indexOf(player._id) === game.players.length - 1) {
                Player.findByIdAndUpdate(game.players[0]._id, {isGoing: true}, (err, player) => {
                    if (err) {
                        console.log("Error while updating player in give turn");
                        throw err;
                    }
                    res.send(player._id);
                });

            } else {
                Player.findByIdAndUpdate(game.players[game.players.indexOf(player._id) + 1]._id, {isGoing: true}, (err, player) => {
                    if (err) {
                        console.log("Error while updating player in give turn");
                        throw err;
                    }
                    res.send(player._id);
                });
            }
        });

    });
});//give turn to next player

app.put("/:gameId/moneyActions", (req, res) => {
    Game.findById(req.params.gameId, (err, game) => {
        if (err) {
            console.log("Error while finding the game in money actions");
            throw err;
        }
        Player.findById(req.body.from, (err, player) => {
                if (err) {
                    console.log("Error while finding the player in money actions");
                    throw err;
                }
                if (player.isGoing || req.body.redo || req.body.bankerMove) {
                    switch (req.body.type) {
                        case "giveMoney": {
                            if (!req.body.redo) {
                                if (!req.body.bankerMove) {
                                    player.moves.push(req.body);
                                    player.money -= +req.body.total;
                                }
                                if (req.body.for !== "bank") {
                                    Player.findById(req.body.for, (err, receiver) => {
                                        if (err) {
                                            console.log("Error while finding the receiver");
                                            throw err;
                                        }
                                        receiver.money += +req.body.total;
                                        receiver.save(err => {
                                            if (err) {
                                                console.log("Error while saving the player");
                                                throw err;
                                            }
                                            player.save(err => {
                                                if (err) {
                                                    console.log("Error while saving the player");
                                                    throw err;
                                                }
                                                res.send(player.money.toString());
                                            });
                                        });
                                    });
                                } else {
                                    player.save(err => {
                                        if (err) {
                                            console.log("Error while saving the player");
                                            throw err;
                                        }
                                        res.send(player.money.toString());
                                    });
                                }
                            } else {
                                player.moves.splice(player.moves.length - 1, 1);
                                player.money += req.body.total;
                                if (req.body.for !== "bank") {
                                    Player.findById(req.body.for, (err, receiver) => {
                                        if (err) {
                                            console.log("Error while finding the receiver");
                                            throw err;
                                        }
                                        receiver.money -= +req.body.total;
                                        receiver.save(err => {
                                            if (err) {
                                                console.log("Error while saving the player");
                                                throw err;
                                            }
                                        });
                                    });
                                }
                                player.save(err => {
                                    if (err) {
                                        console.log("Error while saving the player");
                                        throw err;
                                    }
                                });
                                if (player.moves.length === 0) {
                                    res.json({type: "Filler type"});
                                } else {
                                    res.json(player.moves[player.moves.length - 1]);
                                }
                            }
                            break;
                        }
                        case "gotCircle": {
                            if (req.body.redo) {
                                player.moves.splice(player.moves.length - 1, 1);
                                player.money -= +game.startSettings.moneyForCircle;
                                player.save(err => {
                                    if (err) {
                                        console.log("Error while saving the player in money actions");
                                        throw err;
                                    }
                                    res.json(player.moves[player.moves.length - 1]);
                                });
                            } else {
                                if (player.moves.length === 0 || player.moves[player.moves.length - 1].type !== "gotCircle") {
                                    player.moves.push(req.body);
                                    player.money += +game.startSettings.moneyForCircle;
                                    player.save(err => {
                                        if (err) {
                                            console.log("Error while saving the player in money actions");
                                            throw err;
                                        }
                                        res.send(player.money.toString());
                                    });
                                } else {
                                    res.json({error: "Dont do it so often"});
                                }
                            }
                            break;
                        }
                        case "receive": {
                            Player.findById(req.body.for, (err, receiver) => {
                                if (err) {
                                    console.log("Error while finding the receiver");
                                    throw err;
                                }
                                receiver.money += +req.body.total;
                                receiver.save(err => {
                                    if (err) {
                                        console.log("Error while saving the player");
                                        throw err;
                                    }
                                });
                            });
                            break;
                        }
                        default: {
                            Player.findById(req.query.playerId, (err, player) => {
                                if (err) {
                                    console.log("Error while finding the player in money actions");
                                    throw err;
                                }
                                res.send(player.money.toString());
                            });
                        }
                    }
                } else {
                    res.json({error: "It`s not your turn"});
                }
            }
        );
    });
});//operations with money


app.ws("/:gameId", ws => {
    for(let key in connections){
        if(connections.hasOwnProperty(key)){
            if ( connections[key] === ws ) {
                pickPlayer(key);
            }
        }
    }
    ws.on("message", msg => {
        let data = JSON.parse(msg);
        debugger;
        if (data) {
            switch (data.type) {
                case "giveTurn": {
                    if (data.nextPlayerId) {
                        wss.getWss().clients.forEach(e => {
                            let action = {
                                type: "giveTurn",
                                id: data.nextPlayerId,
                            };
                            e.send(JSON.stringify(action));
                        });
                    }
                    break;
                }
                case "giveMoney": {
                    wss.getWss().clients.forEach(e => {
                        e.send(JSON.stringify(data));
                    });
                    break;
                }
                case "gotCircle": {
                    wss.getWss().clients.forEach(e => {
                        e.send(JSON.stringify(data));
                    });
                    break;
                }
                case "sendId": {
                    connections[data.id] = ws;
                }
            }
        }
    });
    ws.on("close", () => {
        for(let key in connections){
            if(connections.hasOwnProperty(key)){
                if ( connections[key] === ws ) {
                    unpickPlayer(key);
                }
            }
         }
    });
    ws.on("error", err => {
        console.log(err);
    });
});


module.exports = server;






























