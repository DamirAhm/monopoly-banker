let bankerId;

if (document.getElementsByClassName("player-cont").length){
    bankerId = document.getElementsByClassName("player-cont")[0].id;
}

//get player and player container elements
let players = document.getElementsByClassName("player");
let playersCont = document.getElementsByClassName("players-cont")[0];

//create new add player btn
let createAddPlayerBtn = () => {
    let addPlayerBtn = document.createElement("div");
    addPlayerBtn.classList.add("player");
    addPlayerBtn.classList.add("add-player");
    addPlayerBtn.innerText = "Add player";
    let addPlayerBtnCont = document.createElement("div");
    addPlayerBtnCont.classList.add("add-player-cont");
    let divx = document.createElement("div");
    let div = document.createElement("div");
    addPlayerBtn.addEventListener("click", () => {
        playerAction(addPlayerBtn, addPlayerBtn.innerText);
    });
    addPlayerBtnCont.appendChild(div);
    addPlayerBtnCont.appendChild(addPlayerBtn);
    addPlayerBtnCont.appendChild(divx);
    return addPlayerBtnCont;
};

//delete player by id
let deleteName = (deleter, e) => {
    let addPlayerBtnCont = createAddPlayerBtn();
    let parent = deleter.parentNode;
    let playerId = parent.id;
    parent.remove();
    if (document.getElementsByClassName("player-cont").length === 5) {
        playersCont.appendChild(addPlayerBtnCont);
    }
    if (deleter.parentNode.children[0].checked === true || playersCont.children.length > 1) {
        playersCont.children[0].children[0].checked = true;
    }
    e.stopPropagation();
    if (document.getElementById(playerId)) {
        document.getElementById(playerId).remove();
    }
    if (document.getElementsByClassName("add-player").length === 0) {
        playersCont.appendChild(addPlayerBtnCont);
    }
    if (document.getElementById(playerId)) {
        deleteName(document.getElementById(playerId), e);
    }
    axios.get(`${document.location.href}/delete-player?id=${parent.id}`);
};

//action for add players or change names
let playerAction = (player, text) => {
    //create new addPlayer button
    let addPlayerBtnCont = createAddPlayerBtn();

    //func for delete players
    let deleteName = (deleter, e) => {
        let parent = deleter.parentNode;
        let playerId = parent.id;
        parent.remove();
        if (document.getElementsByClassName("player-cont").length === 5) {
            playersCont.appendChild(addPlayerBtnCont);
        }
        if (deleter.parentNode.children[0].checked === true || playersCont.children.length > 1) {
            playersCont.children[0].children[0].checked = true;
        }
        e.stopPropagation();
        if (document.getElementsByClassName("add-player").length === 0) {
            playersCont.appendChild(addPlayerBtnCont);
        }
        if (document.getElementById(playerId)) {
            deleteName(document.getElementById(playerId), e);
        }
        axios.get(`${document.location.href}/delete-player?id=${parent.id}`);
    };

    //return old name or dont create new player
    let back = (player, text, e) => {
        player.classList.remove("changing");
        player.innerHTML = text;
        e.stopPropagation();
    };
    //confirm new player
    let confirm = (player, text, e) => {
        //action logic
        if (player.classList.contains("add-player")) {
            if (player.children[0].value) {
                axios.get(`${document.location.href}/new-player?name=${player.children[0].value}`).then(id => {
                    player.parentNode.id = id.data;
                });

                //create new checkbox
                let checkbox = document.createElement("input");
                checkbox.classList.add("isBanker");
                checkbox.type = "checkbox";
                checkbox.addEventListener("click", () => {
                    makeBanker(checkbox);
                });
                if (document.getElementsByClassName("player-cont").length === 0) {
                    checkbox.checked = true;
                    bankerId = player.id;
                }else {
                    checkbox.checked = false;
                }
                player.parentNode.replaceChild(checkbox, player.previousSibling);
                if (playersCont.children.length < 6) {
                    playersCont.appendChild(addPlayerBtnCont);
                }
                //change add-player button to player button
                player.classList.remove("add-player");
                player.parentNode.classList.remove("add-player-cont");
                player.parentNode.classList.add("player-cont");
                player.nextSibling.classList.add("delete");
                player.nextSibling.innerText = "x";
                player.nextSibling.addEventListener("click", (e) => {
                    deleteName(player, e);
                });
            }
        } else {
            axios.get(`${document.location.href}/change-name/${player.parentNode.id}?name=${player.children[0].value}`);
        }
        player.innerHTML = player.children[0].value || text;
        player.classList.remove("changing");
        e.stopPropagation();
    };

//set player buttons and give actions for them
    if (!player.classList.contains("changing")) {
        player.innerText = "";
        player.classList.add("changing");
        let input = document.createElement("input");
        input.classList.add("changeName");
        if (text === "Banker name" || text === "Add player") {
            input.placeholder = text;
        } else {
            input.value = text;
        }
        input.style.display = "table-cell";
        let confBtn = document.createElement("button");
        confBtn.addEventListener("click", (e) => {
            confirm(player, text, e);
        });
        let rejBtn = document.createElement("button");
        rejBtn.addEventListener("click", (e) => {
            back(player, text, e);
        });
        let btnCont = document.createElement("div");
        btnCont.classList.add("btn-cont");
        rejBtn.innerText = "Back";
        rejBtn.id = "reject";
        confBtn.innerText = "Confirm";
        confBtn.id = "confirm";
        btnCont.appendChild(rejBtn);
        btnCont.appendChild(confBtn);
        player.appendChild(input);
        player.appendChild(btnCont);
        input.onsubmit = (e) => {
            confirm(player, text, e);
        };
        input.focus();
    }
};

//set add-player button (да да да костылиииии)
let addPlayerBtn = document.getElementsByClassName("add-player")[0];
if (addPlayerBtn) {
    addPlayerBtn.addEventListener("click", () => {
        playerAction(addPlayerBtn, "Add player");
    });
}

//add actions to player buttons
for (let i = 0; i < players.length; i++) {
    players[i].addEventListener("click", () => {
        playerAction(players[i], players[i].innerText);
    });
    let check = document.getElementsByClassName("isBanker");
    for (let j = 0; j < check; j++) {
        check[i].checked = false;
    }
    if (i === 0 && !players[i].classList.contains("add-player")) {
        players[i].previousSibling.checked = true;
    }
    if (players[i].parentNode.classList.contains("player-cont")) {
        players[i].nextSibling.addEventListener("click", (e) => {
            deleteName(players[i], e);
        });
    }
}

//set change sequence func
let changeSequenceBtn = document.getElementById("change-sequence-btn");

//button for change player sequence and her bg
let bgCont = document.getElementsByClassName("bg-cont")[0];

let changeSequence = () => {
    if (document.getElementsByClassName("player-cont").length > 1) {
        let newSequence = [];
        let addToQueue = (elem) => {
            newSequence.push(elem);
            if (elem.parentNode.children.length <= 1) {
                close();
            }
            elem.remove();
        };

        //close change sequnce window
        let close = () => {
            let newSequenceData = [];
            let players = document.getElementsByClassName("player-cont");
            for (let i = 0; i < players.length; i++) {
                players[i].children[1].innerText = newSequence[i].innerText;
                players[i].id = newSequence[i].id;
                players[i].children[0].checked = players[i].id === bankerId;
                newSequenceData.push({
                    id: newSequence[i].id,
                    name: newSequence[i].innerText
                });
            }
            axios.post("./players/change-sequence", newSequenceData);
            bgCont.style.display = "none";
        };
        axios.get(`./players`).then(res => {
            let players = res.data;
            let playersElems = [];
            players.forEach(e => {
                let elem = document.createElement("div");
                elem.innerText = e.name;
                elem.id = e._id;
                elem.classList.add("player");
                elem.addEventListener("click", () => {
                    addToQueue(elem);
                });
                playersElems.push(elem);
            });
            playersElems.forEach(e => {
                bgCont.children[0].children[0].appendChild(e);
            });
        });
        bgCont.style.display = "flex";
    }
};
changeSequenceBtn.addEventListener("click", changeSequence);

//go to standart settings
let reset = () => {
    document.getElementById("maxTime").value = "0";
    document.getElementById("circleMoney").value = "2000";
    document.getElementById("startMoneyIn").value = "15000";
    document.getElementById("turn-on").checked = false;
    toggleOn(false);
};

//set reset button
document.getElementById("reset").addEventListener("click", reset);

//set create game action
let create = () => {
    if (document.getElementsByClassName("player-cont").length >= 2) {
        if (document.getElementById("startMoneyIn").value) {
            if(+document.getElementById("startMoneyIn").value >= 0 && +document.getElementById("circleMoney").value >= 0) {
                let players = document.getElementsByClassName("player-cont");
                let bankerId;
                for (let i = 0; i < players.length; i++) {
                    if(players[i].children[0].checked){
                        bankerId = players[i].id;
                    }
                }
                axios.post(`${document.location.href}`, {
                    startMoney: +document.getElementById("startMoneyIn").value,
                    moneyForCircle: +document.getElementById("circleMoney").value,
                    bankerId: bankerId
                }).then(() => {
                    document.location.replace(`./`);
                })
            }else{
                alert("Values cant be negative")
            }
        } else {
            alert("Enter start money");
        }
    } else {
        alert("Minimal players count is 2");
    }
};

//set create button
document.getElementById("next").addEventListener("click", create);

//change game banker
let makeBanker = (playerCheckbox) => {
    //set isBanker checkbox
    let checkBoxes = document.getElementsByClassName("isBanker");
    for (let i = 0; i < checkBoxes.length; i++) {
        checkBoxes[i].checked = false;
    }
    playerCheckbox.checked = true;
    bankerId = playerCheckbox.parentElement.id;
};

//give action to checkboxes
let checkBoxes = document.getElementsByClassName("isBanker");
for (let i = 0; i < checkBoxes.length; i++) {
    checkBoxes[i].addEventListener("click", () => {
        makeBanker(checkBoxes[i]);
    });
}
