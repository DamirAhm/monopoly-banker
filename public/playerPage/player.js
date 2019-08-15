(() => {
    let playerId = document.getElementsByTagName("html")[0].dataset.playerid;
    let gameId = document.getElementsByTagName("html")[0].dataset.gameid;
    let host = document.location.host.split("/")[0];

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

//plus minus btns
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
        let player = document.createElement("div");
        player.classList.add("playerMove");
        player.dataset.id = playerData._id;
        let fstRow = document.createElement("div");
        fstRow.classList.add("fstMoveRow");
        let name = document.createElement("span");
        name.innerText = playerData.name;
        fstRow.appendChild(name);
        let sndRow = document.createElement("div");
        sndRow.classList.add("sndMoveRow");
        let movesCount = document.createElement("span");
        movesCount.classList.add("movesCount");
        movesCount.innerText = "?";
        let count = document.createElement("span");
        count.innerText = `${playerData.moves.length} moves more`;
        count.classList.add("count");
        movesCount.appendChild(count);
        movesCount.addEventListener("mouseover", (e) => {
            hoverCount(e);
        });
        movesCount.addEventListener("mouseout", (e) => {
            hoverCount(e);
        });
        let moveCont = document.createElement("div");
        moveCont.classList.add("moveCont");
        let type = document.createElement("span");
        let total = document.createElement("span");
        let target = document.createElement("span");
        moveCont.appendChild(type);
        moveCont.appendChild(total);
        moveCont.appendChild(target);
        if (playerData.moves.length !== 0) {
            updateMove(moveCont, playerData.moves[playerData.moves.length - 1]);
        }
        sndRow.appendChild(moveCont);
        sndRow.appendChild(movesCount);
        player.appendChild(fstRow);
        player.appendChild(sndRow);
        document.getElementById("moveLog").appendChild(player)
    };

//update player last move
    let updateMove = (playerMoveCont, move) => {
        switch (move.type) {
            case "giveMoney": {
                let playerName = move.for !== "bank" ? players.find(e => e._id === move.for).name : "Bank";
                playerMoveCont.children[0].innerText = "Gave ";
                playerMoveCont.children[1].innerText = move.total + (move.total === 1 ? " thousand for " : " thousand for ");
                playerMoveCont.children[2].innerText = playerName;
                break;
            }
            case "gotCircle": {
                let player = players.find(e => e._id === playerId);
                playerMoveCont.children[0].innerText = "Went a circle";
                playerMoveCont.children[1].innerText = html.dataset.mpc;
                playerMoveCont.children[2].innerText = player.name;
                break;
            }
        }
    };

//check how many moves more
    let hoverCount = (e) => {
        if (e.target.children[0]) {
            if (e.type === "mouseover") {
                e.target.children[0].style.display = "inline";
                let conts = document.getElementsByClassName("movesCount");
                for (let i = 0; i < conts.length; i++) {
                    if (conts[i] !== e.target) {
                        conts[i].style.visibility = "hidden"
                    }
                }
            } else if (e.type === "mouseout") {
                e.target.children[0].style.display = "none";
                let conts = document.getElementsByClassName("movesCount");
                for (let i = 0; i < conts.length; i++) {
                    if (conts[i] !== e.target) {
                        conts[i].style.visibility = "visible"
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
            confirmUpdate(e, oldMoney, newMoney);
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
            total: +delta
        }));
        axios.put(`http://${host}/${gameId}/moneyActions?playerId=${playerId}`, {
            type: "receive",
            total: +delta,
            for: oldMoney.id.split("money")[0]
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
            newPayListPlayer(e);
            newPlayerInfo(e);
            newMoveCont(e);
        });
    });

//give money to other player
    let onPlayerPick = (e) => {
        let moneyCount = input.value;
        document.getElementsByClassName("bg-cont")[0].style.display = "none";
        input.value = "";
        let moneySpan = document.getElementById(playerId + "money");
        moneySpan.innerText = (+moneySpan.innerText - +moneyCount).toString();
        axios.put(`http://${host}/${gameId}/moneyActions?playerId=${playerId}`, {
            type: "giveMoney",
            total: +moneyCount,
            for: e.target.id
        }).then(res => {
            money.innerText = res.data;
        });
        if (e.target.id !== "bank") {
            socket.send(JSON.stringify({
                type: "giveMoney",
                for: e.target.id,
                total: +moneyCount
            }));
        }
    };

//opens a choose player monitor
    let minusMoney = () => {
        if (input.value) {
            if (+money.innerText > +input.value) {
                document.getElementsByClassName("bg-cont")[0].style.display = "flex";
            } else {
                alert("Not enough money");
            }
        } else {
            alert("Enter money total");
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
        axios.put(`http://${host}/${gameId}/moneyActions?playerId=${html.dataset.playerid}`, {
            type: "gotCircle"
        }).then(res => {
            if (res.data.error) {
                alert(res.data.error);
            } else {
                money.innerText = res.data;
            }
        });
        giveTurn(e);
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
            socket.send(JSON.stringify({
                type: "giveTurn",
                nextPlayerId: res.data
            }));
        });
        changeIsGoing(false);
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
        console.log("open");
    };

//works when web socket close connection
    socket.onclose = () => {
        console.log("closed");
    };

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
                if (data.id === playerId) {
                    money.innerText = +money.innerText + data.moneyTotal;
                }
                if (html.dataset.isbanker === "true") {
                    let moneySpan = document.getElementById(data.id + "money");
                    moneySpan.innerText = +moneySpan.innerText + data.moneyTotal;
                }
            }
        }
    };
})();
