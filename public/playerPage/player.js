(() => {
    let playerId = document.getElementsByTagName("html")[0].dataset.playerid;
    let gameId = document.getElementsByTagName("html")[0].dataset.gameid;
    let host = document.location.host.split("/")[0];
    let isPicked = false;
    let socket = new WebSocket(`ws://${host}/${gameId}`);

//array with players in game to give them money
    let players = [];

    document.getElementById("bank").addEventListener("click", (e) => {
        onPlayerPick(e);
    });

//span with money
    let money = document.getElementById("money");

//money input
    let input = document.getElementById("input");

//minus btns
    let [minusBtn] = document.getElementsByClassName("moneyBtns")[0].children;

    minusBtn.addEventListener("click", (e) => {
        minusMoney(e);
    });

    let pickPlayer = document.getElementById("pick-player-to-pay");

//add new player to container
    let newPayListPlayer = (playerData) => {
        if (playerData._id !== playerId) {
            let player = document.createElement("div");
            player.classList.add("player");
            player.classList.add("center");
            player.innerText = playerData.name;
            player.id = playerData._id;
            player.addEventListener("click", (e) => {
                onPlayerPick(e);
            });
            pickPlayer.appendChild(player);
        }
    };

//add new player to other players container to control their money
    let newPlayerInfo = (playerData) => {
        let player = document.createElement("div");
        player.classList.add("playerInfo");
        player.classList.add("center");
        if (playerData.isGoing) {
            player.classList.add("going");
        } else {
            player.classList.add("waiting");
        }
        let nameCont = document.createElement("span");
        nameCont.innerText = playerData.name;
        let moneyCont = document.createElement("span");
        moneyCont.innerText = playerData.money;
        moneyCont.classList.add("moneyCont");
        moneyCont.id = playerData._id + "money";
        player.dataset.id = playerData._id;
        player.appendChild(nameCont);
        player.appendChild(moneyCont);
        player.addEventListener("click", (e) => {
            changePlayerMoney(e);
        });
        document.getElementById("playersMoney").appendChild(player);
    };

//add new player move container to control their moves to make money control easier
    let newMoveCont = (playerData) => {
        let player = createPlayer(playerData._id);
        let fstRow = createFstRow(playerData.name);
        let sndRow = createSndRow(playerData.moves[playerData.moves.length - 1], playerData.moves.length);
        player.appendChild(fstRow);
        player.appendChild(sndRow);

        document.getElementById("moveLog").appendChild(player);
    };

//functions to make a player moves
    let createPlayer = (playerId) => {
        let player = document.createElement("div");
        player.classList.add("playerMove");
        player.dataset.id = playerId;
        return player;
    };
    let createFstRow = (playerName) => {
        let fstRow = document.createElement("div");
        fstRow.classList.add("fstMoveRow");
        //create name span
        let name = document.createElement("span");
        name.innerText = playerName;
        fstRow.appendChild(name);
        return fstRow;
    };
    let createSndRow = (lastMove, movesCount) => {
        //create parent element
        let sndRow = document.createElement("div");
        sndRow.classList.add("sndMoveRow");

        //create container with move
        let moveCont = document.createElement("div");
        moveCont.classList.add("moveCont");

        //create characteristics of move
        let type = document.createElement("span");
        let total = document.createElement("span");
        let target = document.createElement("span");
        target.style.fontWeight = "bolder";
        target.style.color = "white";

        moveCont.appendChild(type);
        moveCont.appendChild(total);
        moveCont.appendChild(target);

        //create delete button
        let deleteBtn = createDeleteBtn(+movesCount === 0 ? 0 : +movesCount - 1);

        sndRow.appendChild(moveCont);
        sndRow.appendChild(deleteBtn);

        //fill move container
        if (lastMove) {
            updateMove(moveCont, lastMove);
            //add there because it must be mounted
            deleteBtn.onclick = () => {
                redoMove(lastMove, deleteBtn.previousSibling);
            };
        } else {
            //if player moves are clear
            moveCont.children[0].innerText = "Player dont do anything";
            moveCont.children[1].innerText = "";
            moveCont.children[2].innerText = "";
            moveCont.nextSibling.style.display = "none";
        }
        return sndRow;
    };
    let createDeleteBtn = (movesCount) => {
        //create delete button
        let deleteBtn = document.createElement("span");
        deleteBtn.classList.add("delete");
        deleteBtn.innerText = "x";

        //create span with moves count
        let count = document.createElement("span");
        count.innerText = movesCount === 0 ?  "No more moves" : (`${movesCount} moves more`);
        count.classList.add("count");
        deleteBtn.appendChild(count);

        //add events to show moves count
        deleteBtn.addEventListener("mouseover", (e) => {
            hoverCount(e);
        });
        deleteBtn.addEventListener("mouseout", (e) => {
            hoverCount(e);
        });
        return deleteBtn;
    };

//redo move and replace with previous
    let redoMove = (move, moveCont) => {
        if (move) {
            axios.put(`http://${host}/${gameId}/moneyActions?playerId=${playerId}`, {...move, redo: true})
                .then(res => {
                    updateMove(moveCont, res.data);
                    changeMovesCount(moveCont);
                });
            socket.send(JSON.stringify({...move, redo: true}));
        }
    };

//change moves count in given move container
    let changeMovesCount = (moveCont) => {
        if (moveCont && moveCont.nextSibling) {
            let id = moveCont.parentElement.parentElement.dataset.id;
            let countElement = moveCont.nextSibling.children[0];
            if (id) {
                axios.get(`http://${host}/${gameId}/movesLeft?playerId=${id}`)
                    .then(res => {
                        if (!res.data.error) {
                            let count = res.data - 1;
                            countElement.innerText = count > 0 ? (count + (count === 1 ? " move more" : " moves more")) : "No more moves";
                        } else {
                            throw new Error(res.data.error);
                        }
                    });
            } else {
                console.log("Error at mvC");
            }
        }
    };

//update player last move
    let updateMove = (playerMoveCont, move) => {
        if (!move.error) {
            switch (move.type) {
                case "giveMoney": {
                    playerMoveCont.nextSibling.style.display = "block";
                    playerMoveCont.nextSibling.onclick = () => {
                        redoMove(move, playerMoveCont);
                    };
                    let playerName = move.for !== "bank" ? players.find(e => e._id === move.for).name : "Bank";
                    playerMoveCont.children[0].innerText = "Gave ";
                    playerMoveCont.children[1].innerText = move.total + (move.total === 1 ? " thousand for " : " thousands for ");
                    playerMoveCont.children[2].innerText = playerName;
                    playerMoveCont.parentElement.classList.add("not-going");
                    if (playerMoveCont.parentElement.classList.contains("going")) {
                        playerMoveCont.parentElement.classList.remove("going");
                    }
                    break;
                }
                case "gotCircle": {
                    playerMoveCont.nextSibling.style.display = "block";
                    playerMoveCont.nextSibling.onclick = () => {
                        redoMove(move, playerMoveCont);
                    };
                    playerMoveCont.children[0].innerText = "Went a circle + ";
                    playerMoveCont.children[1].innerText = html.dataset.mpc;
                    playerMoveCont.children[2].innerText = "";
                    playerMoveCont.parentElement.classList.add("going");
                    if (playerMoveCont.parentElement.classList.contains("not-going")) {
                        playerMoveCont.parentElement.classList.remove("not-going");
                    }
                    break;
                }
                default: {
                    playerMoveCont.nextSibling.style.display = "none";
                    playerMoveCont.nextSibling.children.innerText = "0 moves more";
                    playerMoveCont.children[0].innerText = "Player dont do anything";
                    playerMoveCont.children[1].innerText = "";
                    playerMoveCont.children[2].innerText = "";
                    if (playerMoveCont.parentElement.classList.contains("going")) {
                        playerMoveCont.parentElement.classList.remove("going");
                    } else if (playerMoveCont.parentElement.classList.contains("not-going")) {
                        playerMoveCont.parentElement.classList.remove("not-going");
                    }
                }
            }
        } else {
            throw new Error(move.error);
        }
    };

//check how many moves more on  hover
    let hoverCount = (e) => {
        if (e.target.children[0]) {
            if (e.type === "mouseover") {
                e.target.children[0].style.display = "inline";
                let conts = document.getElementsByClassName("delete");
                for (let i = 0; i < conts.length; i++) {
                    if (conts[i] !== e.target) {
                        conts[i].style.visibility = "hidden";
                    }
                }
            } else if (e.type === "mouseout") {
                e.target.children[0].style.display = "none";
                let conts = document.getElementsByClassName("delete");
                for (let i = 0; i < conts.length; i++) {
                    if (conts[i] !== e.target) {
                        conts[i].style.visibility = "visible";
                    }
                }
            }
        }
    };

//change players money in players money page
    let changePlayerMoney = (e) => {
        let oldMoney = e.target.children[1];
        let width = oldMoney.offsetWidth;
        let playerCont = e.target;
        let newMoney = document.createElement("input");
        newMoney.type = "number";
        newMoney.autofocus = true;
        newMoney.style.display = "inline";
        newMoney.style.width = (width + 20) + "px";
        newMoney.defaultValue = oldMoney.innerText;
        newMoney.classList.add("newMoney");
        playerCont.replaceChild(newMoney, oldMoney);
        let btnCont = document.createElement("div");
        btnCont.classList.add("btnCont");
        let confirmBtn = document.createElement("button");
        confirmBtn.classList.add("confirm");
        confirmBtn.innerText = "Update";
        confirmBtn.addEventListener("click", (e) => {
            confirmUpdate(e, oldMoney);
        });
        let backBtn = document.createElement("button");
        backBtn.classList.add("back");
        backBtn.innerText = "Back";
        backBtn.addEventListener("click", (e) => {
            backFromUpdate(e, oldMoney);
        });
        btnCont.appendChild(confirmBtn);
        btnCont.appendChild(backBtn);
        let newPlayerCont = document.createElement("form");
        newPlayerCont.classList.add("changeMoneyForm");
        newPlayerCont.appendChild(playerCont.cloneNode(true));
        newPlayerCont.appendChild(btnCont);
        newPlayerCont.onsubmit = (e) => {
            confirmUpdate(e, oldMoney);
        };
        playerCont.parentElement.replaceChild(newPlayerCont, playerCont);
    };

//confirms money update
    let confirmUpdate = (e, oldMoney) => {
        e.preventDefault();
        let playerInfo = e.target.parentElement.previousSibling;
        let delta = +playerInfo.children[1].value - +oldMoney.innerText;
        e.target.parentElement.previousSibling.replaceChild(oldMoney, playerInfo.children[1]);
        playerInfo = playerInfo.cloneNode(true);
        playerInfo.addEventListener("click", (e) => {
            changePlayerMoney(e);
        });
        e.target.parentElement.parentElement.replaceWith(playerInfo);
        socket.send(JSON.stringify({
            type: "giveMoney",
            for: oldMoney.id.split("money")[0],
            total: +delta,
            from: playerId,
            redo: false,
            bankerMove: true
        }));
        axios.put(`http://${host}/${gameId}/moneyActions?playerId=${playerId}`, {
            type: "receive",
            total: +delta,
            for: oldMoney.id.split("money")[0],
            from: playerId,
            redo: false,
            bankerMove: true
        });
    };

//back from money update
    let backFromUpdate = (e, oldMoney) => {
        e.preventDefault();
        let playerInfo = e.target.parentElement.previousSibling;
        e.target.parentElement.previousSibling.replaceChild(oldMoney, playerInfo.children[1]);
        playerInfo = playerInfo.cloneNode(true);
        playerInfo.addEventListener("click", (e) => {
            changePlayerMoney(e);
        });
        e.target.parentElement.parentElement.replaceWith(playerInfo);
    };

//get players
    axios.get(`http://${host}/${gameId}/players`).then(res => {
        players = res.data;
        res.data.forEach(e => {
            //add to pay list(opens in minusMoney)
            newPayListPlayer(e);
            if (html.dataset.isbanker === "true") {
                //add to players money page
                newPlayerInfo(e);
                //add to move log page
                newMoveCont(e);
            }
        });
    });

//works on click on player in pay list
    let onPlayerPick = (e) => {
        let moneyCount = input.value;
        document.getElementsByClassName("bg-cont")[0].style.display = "none";
        input.value = "";
        axios.put(`http://${host}/${gameId}/moneyActions?playerId=${playerId}`, {
            type: "giveMoney",
            total: +moneyCount,
            for: e.target.id,
            redo: false,
            from: playerId
        }).then(res => {
            if (!res.data.error) {
                socket.send(JSON.stringify({
                    type: "giveMoney",
                    for: e.target.id,
                    total: +moneyCount,
                    from: playerId,
                    redo: false
                }));
                money.innerText = res.data;
            } else {
                throw new Error(res.data.error);
            }
        });
    };

//opens a choose player monitor
    let minusMoney = () => {
        if (+input.value > 0) {
            if (+money.innerText > +input.value) {
                document.getElementsByClassName("bg-cont")[0].style.display = "flex";
            } else {
                alert("Not enough money");
            }
        } else {
            alert("Enter not negative money total");
        }
    };

//go to choose player monitor
    let signOut = () => {
        document.location.replace(`http://${host}/${gameId}`);
        axios.get(`http://${host}/${gameId}/unpick-player?id=${document.location.search.split("=")[1]}`);
    };

    document.getElementById("changePlayer").addEventListener("click", signOut);

//func while you got circle
    let gotCircle = (e) => {
        e.preventDefault();
        let action = {
            type: "gotCircle",
            from: playerId,
            redo: false
        };
        axios.put(`http://${host}/${gameId}/moneyActions?playerId=${html.dataset.playerid}`, action)
            .then(res => {
                if (res.data.error) {
                    alert(res.data.error);
                } else {
                    money.innerText = res.data;
                    socket.send(JSON.stringify(action));
                    giveTurn(e);
                }
            });
    };

    document.getElementById("gotCircle").addEventListener("click", (e) => {
        gotCircle(e);
    });

//change player controls page while (not) going
    let changeIsGoing = (isGoing) => {
        isGoing = !isGoing;
        document.getElementsByClassName("isMyTurn")[0].classList.remove(isGoing ? "going" : "not-going");
        document.getElementsByClassName("isMyTurn")[0].classList.add(isGoing ? "not-going" : "going");
        document.getElementsByClassName("isMyTurn")[0].innerText = isGoing ? "Not your turn" : "Your turn";
        document.getElementById("minus").disabled = isGoing;
        document.getElementById("gotCircle").disabled = isGoing;
        document.getElementById("nextPlayer").disabled = isGoing;
        document.getElementById("input").disabled = isGoing;
    };

//give turn to next player
    let giveTurn = (e) => {
        e.preventDefault();
        axios.get(`http://${host}/${gameId}/giveTurn?playerId=${html.dataset.playerid}`).then(res => {
            if (!res.data.error) {
                socket.send(JSON.stringify({
                    type: "giveTurn",
                    nextPlayerId: res.data
                }));
                changeIsGoing(false);
            } else {
                throw new Error(res.data.error);
            }
        });
    };

//give next player btn action
    document.getElementById("nextPlayer").addEventListener("click", (e) => {
        giveTurn(e);
    });

//pages for banker
    let options = document.getElementsByClassName("option");

//switch banker`s pages
    let optionAction = (e) => {
        document.getElementsByClassName("active")[0].classList.remove("active");
        e.target.classList.add("active");
        document.getElementById("playersMoney").style.display = "none";
        document.getElementById("playerControls").style.display = "none";
        document.getElementById("moveLog").style.display = "none";
        switch (e.target.id) {
            case "yourControlsBtn": {
                document.getElementById("playerControls").style.display = "flex";
                break;
            }
            case "otherPlayersBtn": {
                document.getElementById("playersMoney").style.display = "flex";
                break;
            }
            case "moveLogBtn": {
                document.getElementById("moveLog").style.display = "flex";
                break;
            }
        }
    };

//give actions to options
    for (let i = 0; i < options.length; i++) {
        options[i].addEventListener("click", (e) => {
            optionAction(e);
        });
    }

//works when web socket opens connection
    socket.onopen = () => {
        socket.send(JSON.stringify({
            type: "sendId",
            id: playerId,
            game: gameId
        }));
        axios.get(`http://${host}/${gameId}/pick-player?id=${playerId}`)
            .then(err => {
                if (err.data.error) {
                    console.log(err.data);
                    document.getElementsByClassName("container")[0].innerHTML = err.data.error;
                    isPicked = true;
                }
            });
    };

//works when web socket close connection
    if (!isPicked) {
        socket.onclose = () => {
            alert("Please reload the page");
        };
    }

//works when web socket receive a message / action
    socket.onmessage = res => {
        let data = JSON.parse(res.data);
        switch (data.type) {
            case "giveTurn": {
                if (data.id === playerId) {
                    changeIsGoing(true);
                }
                if (html.dataset.isbanker === "true") {
                    let infos = document.getElementsByClassName("playerInfo");
                    //change going player in players money page
                    for (let i = 0; i < infos.length; i++) {
                        if (infos[i].classList.contains("going")) {
                            infos[i].classList.remove("going");
                        } else if (infos[i].classList.contains("waiting")) {
                            infos[i].classList.remove("waiting");
                        }
                        if (infos[i].dataset.id === data.id) {
                            infos[i].classList.add("going");
                            if (infos[i].classList.contains("waiting")) {
                                infos[i].classList.remove("waiting");
                            } else if (infos[i].classList.contains("loosed")) {
                                infos[i].classList.remove("loosed");
                            }
                        } else if (!infos[i].classList.contains("loosed")) {
                            infos[i].classList.add("waiting");
                            if (infos[i].classList.contains("going")) {
                                infos[i].classList.remove("going");
                            } else if (infos[i].classList.contains("loosed")) {
                                infos[i].classList.remove("loosed");
                            }
                        }
                    }
                }
                break;
            }
            case "giveMoney": {
                if (!data.redo) {
                    if (data.for === playerId) {
                        money.innerText = +money.innerText + data.total;
                    }
                } else {
                    if (data.for === playerId) {
                        money.innerText = (+money.innerText - data.total).toString();
                    } else if (data.from === playerId) {
                        money.innerText = +money.innerText + data.total;
                    }
                }
                if (html.dataset.isbanker === "true") {
                    if (data.for !== "bank") {
                        let moneySpan = document.getElementById(data.for + "money");
                        moneySpan.innerText = (+moneySpan.innerText + (data.redo ? -data.total : +data.total)).toString();
                    }
                    if (!data.bankerMove) {
                        let moneySpan = document.getElementById(data.from + "money");
                        moneySpan.innerText = (+moneySpan.innerText + (data.redo ? +data.total : -data.total)).toString();
                    }
                    if (!data.bankerMove) {
                        let playerMoves = document.getElementsByClassName("playerMove");
                        for (let i = 0; i < playerMoves.length; i++) {
                            if (playerMoves[i].dataset.id === data.from) {
                                updateMove(playerMoves[i].children[1].children[0], data, true);
                                if (!data.redo) {
                                    changeMovesCount(playerMoves[i].children[1].children[0]);
                                }
                            }
                        }
                    }
                }
                break;
            }
            case "gotCircle": {
                if (html.dataset.isbanker === "true") {
                    let moneySpan = document.getElementById(data.from + "money");
                    moneySpan.innerText = (+moneySpan.innerText + (data.redo ? -parseInt(html.dataset.mpc) : +parseInt(html.dataset.mpc))).toString();
                    let playerMoves = document.getElementsByClassName("moveCont");
                    for (let i = 0; i < playerMoves.length; i++) {
                        if (playerMoves[i].parentElement.parentElement.dataset.id === data.from) {
                            updateMove(playerMoves[i], data, true);
                            if (!data.redo) {
                                changeMovesCount(playerMoves[i].children[1].children[0]);
                            }
                        }
                    }
                }
                if ( data.redo && data.from === playerId ) {
                    money.innerText = (+money.innerText + (data.redo ? -parseInt(html.dataset.mpc) : +parseInt(html.dataset.mpc))).toString();
                }
                break;
            }
            case "timeOver": {
                alert("Game time is over");
            }
        }
    };
})();
