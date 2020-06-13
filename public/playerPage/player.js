const playerId = document.querySelector( "html" ).dataset.playerid;
const gameId = document.querySelector( "html" ).dataset.gameid;
const isBanker = document.querySelector( "html" ).dataset.isbanker === "true";
const startSettings = JSON.parse( document.querySelector( "html" ).dataset.startsettings );
const createdAt = Date.parse( startSettings.createdAt );
const host = document.location.host.split( "/" )[ 0 ];
const protocol = document.location.protocol;
const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
let socket;
let isInitialized = false;

//array with players in game to give them money
let players = [];

//* Elements
//html element
let html = document.querySelector( "html" );
//span with money
let money = document.getElementById( "money" );
//money input
let input = document.getElementById( "input" );
//minus btns
let reduceBtn = document.getElementsByClassName( "moneyBtns" )?.[ 0 ]?.children[ 0 ];
//pages for banker
let options = document.getElementsByClassName( "option" );
//block togglers 
let pickPlayer = document.getElementById( "pick-player-to-pay" );
let playersToPick = pickPlayer?.querySelectorAll( ".player" );
let timerSpan = document.getElementById( "timer" );
let playersMoves = document.getElementsByClassName( "playerMove" )
let playersInfos = document.getElementsByClassName( "playerInfo" );
let toggleMenuCont = document.getElementById( "toggleMenu" );
let menu = document.getElementById( "menu" );
let bgCont = document.getElementsByClassName( "bg-cont" )?.[ 0 ];

//change moves count in given move container
let changeMovesCount = ( moveCont ) => {
    if ( moveCont && moveCont.nextSibling ) {
        let id = moveCont.parentElement.parentElement.dataset.id;
        let countElement = moveCont.nextSibling.children[ 0 ];
        if ( id ) {
            axios.get( `${protocol}//${host}/${gameId}/movesLeft?playerId=${id}` )
                .then( res => {
                    if ( !res.data.error ) {
                        let count = res.data - 1;
                        countElement.innerText = count > 0 ? ( count + ( count === 1 ? " move more" : " moves more" ) ) : "No more moves";
                    } else {
                        res.data.error && appendNotification( res.data.error );
                    }
                } );
        } else {
            console.log( "Cant find id" );
        }
    }
};

//redo move and replace with previous
let redoMove = ( move, playerMove ) => {
    if ( move ) {
        axios.put( `${protocol}//${host}/${gameId}/moneyActions?playerId=${playerId}`, { ...move, redo: true } )
            .then( res => {
                updateMove( playerMove, res.data );
                changeMovesCount( playerMove.querySelector( ".moveCont" ) );
            } );
        socket.send( JSON.stringify( { ...move, redo: true } ) );
    }
};
//update player last move
let updateMove = ( playerMoveCont, move ) => {
    if ( !move.error && !move.redo ) {
        const deleteSpan = playerMoveCont.querySelector( ".delete" );
        const moveSpans = playerMoveCont.querySelectorAll( ".moveCont span" );

        switch ( move.type ) {
            case "giveMoney": {
                deleteSpan.style.display = "block";
                deleteSpan.onclick = () => {
                    redoMove( move, playerMoveCont );
                };
                let playerName = move.for !== "bank" ? players.find( e => e._id === move.for ).name : "Bank";
                moveSpans[ 0 ].innerText = "Gave ";
                moveSpans[ 1 ].innerText = move.total + " k for ";
                moveSpans[ 2 ].innerText = playerName;
                break;
            }
            case "gotCircle": {
                deleteSpan.style.display = "block";
                deleteSpan.onclick = () => {
                    redoMove( move, playerMoveCont );
                };
                moveSpans[ 0 ].innerText = "Went a circle + ";
                moveSpans[ 1 ].innerText = startSettings.moneyForCircle;
                moveSpans[ 2 ].innerText = "";
                break;
            }
            default: {
                deleteSpan.style.display = "none";
                deleteSpan.children.innerText = "0 moves more";
                moveSpans[ 0 ].innerText = "Player didn't do anything";
                moveSpans[ 1 ].innerText = "";
                moveSpans[ 2 ].innerText = "";
            }
        }
    } else {
        move.error && appendNotification( move.error );
    }
};
let activateMove = ( playerMove ) => {
    const deleteSpan = playerMove.querySelector( ".delete" );

    if ( deleteSpan ) {
        const move = JSON.parse( playerMove.dataset.move );

        if ( move ) {
            deleteSpan.onclick = () => redoMove( move, playerMove );
        }
    }
}

//confirms money update
let confirmUpdate = ( e, oldMoney ) => {

    let playerInfo = e.target.parentElement.previousSibling;
    let delta = +playerInfo.children[ 1 ].value - +oldMoney.innerText;
    e.target.parentElement.previousSibling.replaceChild( oldMoney, playerInfo.children[ 1 ] );
    playerInfo = playerInfo.cloneNode( true );
    playerInfo.addEventListener( "click", ( e ) => {
        changePlayerMoney( e );
    } );
    e.target.parentElement.parentElement.replaceWith( playerInfo );
    socket.send( JSON.stringify( {
        type: "giveMoney",
        for: oldMoney.id.split( "money" )[ 0 ],
        total: +delta,
        from: playerId,
        redo: false,
        bankerMove: true
    } ) );
    axios.put( `${protocol}//${host}/${gameId}/moneyActions?playerId=${playerId}`, {
        type: "receive",
        total: +delta,
        for: oldMoney.id.split( "money" )[ 0 ],
        from: playerId,
        redo: false,
        bankerMove: true
    } );
};
//back from money update
let backFromUpdate = ( e, oldMoney ) => {

    let playerInfo = e.target.parentElement.previousSibling;
    e.target.parentElement.previousSibling.replaceChild( oldMoney, playerInfo.children[ 1 ] );
    playerInfo = playerInfo.cloneNode( true );
    playerInfo.addEventListener( "click", ( e ) => {
        changePlayerMoney( e );
    } );
    e.target.parentElement.parentElement.replaceWith( playerInfo );
};

//* Modals /
//opens a choose player monitor
let openReceiverPickerModal = () => {
    document.getElementsByClassName( "bg-cont" )?.[ 0 ]?.addEventListener( "click", closeModal );

    if ( +input.value > 0 ) {
        if ( +money.innerText > +input.value ) {
            bgCont.style.display = "flex";
            document.getElementById( "pick-player-to-pay" ).style.display = "flex";
        } else {
            appendNotification( "Not enough money", "warn" );
        }
    } else {
        appendNotification( "Enter not negative money total", "warn" );
    }
};
//opens after  player's lost
let afterLostOptions = () => {
    if ( !isBanker ) {
        const afterLostPrompt = document.getElementById( "afterLostPrompt" );

        afterLostPrompt.style.display = "flex";
        bgCont.style.display = "flex";

        afterLostPrompt.querySelector( "#keepWatching" ).addEventListener( "click", () => {
            bgCont.style.display = "none";
            afterLostPrompt.style.display = "none";
            if ( document.getElementById( "playersMoney" ) )
                document.getElementById( "playersMoney" ).style.display = "flex";
        } );
        afterLostPrompt.querySelector( "#leave" ).addEventListener( "click", () => {
            axios.get( concatURL( document.location.origin, gameId, "players", "delete-player", `?playerId=${playerId}` ) );
            document.location = "/";
        } );
    } else {
        document.getElementById( "yourControlsBtn" )?.remove();
        if ( !document.getElementById( "moveLogBtn" ).classList.contains( "active" ) ) {
            document.getElementById( "playersMoney" ).style.display = "flex";
            document.getElementById( "otherPlayersBtn" ).classList.add( "active" );
        }
        document.getElementsByClassName( "options" )[ 0 ].style.gridTemplateColumns = "repeat(2,1fr)";
    }
}

//change player controls page while (not) going
let changeIsGoing = ( isGoing ) => {
    const turnLabel = document.getElementsByClassName( "isMyTurn" )[ 0 ];
    if ( turnLabel ) {
        turnLabel.classList.remove( isGoing ? "not-going" : "going" );
        turnLabel.classList.add( isGoing ? "going" : "not-going" );
        turnLabel.innerText = isGoing ? "Your turn" : "Not your turn";
        document.getElementById( "minus" ).disabled = !isGoing;
        document.getElementById( "gotCircle" ).disabled = !isGoing || turnsBeforeNewCircle > 0;
        document.getElementById( "nextPlayer" ).disabled = !isGoing;
        document.getElementById( "input" ).disabled = !isGoing;
    }
};
const getIsGoing = () => !document.querySelector( ".isMyTurn" ).classList.contains( "going" );

//show only message on player's screen
let showMessage = ( ...msgs ) => {
    document.getElementsByClassName( "userContent" )?.[ 0 ]?.remove();
    for ( const msg of msgs ) {
        let element;
        if ( msg instanceof Element ) {
            element = msg;
        } else if ( typeof msg === "string" ) {
            const title = document.createElement( "h1" );
            title.innerText = msg;
            element = title;
        }
        document.getElementsByClassName( "container" )?.[ 0 ]?.appendChild( element );
    }
}
//create message with winners of the game
let createWinnerMsg = ( players ) => {
    const element = document.createElement( "p" );
    element.classList.add( "winner" );
    if ( players.length === 1 ) {
        const [ player ] = players;
        element.innerHTML = `Player <span class='winner-name'>${player.name}</span> wins the game with <span class='winner-money'>${player.money} k</span>`;
    } else if ( players.length > 1 ) {
        element.innerHTML = `Players <span class='winner-name'>${players.map( p => p.name ).join( ", " )}</span> win the game with <span class='winner-money'>${players[ 0 ].money} k</span>`;
    }
    return element;
}

//* Socket
const openSocket = () => {
    socket = new WebSocket( `${wsProtocol}//${host}/${document.location.pathname}` );

    //works when web socket opens connection
    socket.onopen = () => {
        socket.send( JSON.stringify( {
            type: "sendId",
            id: playerId,
            gameId: gameId
        } ) );
    };

    //works when web socket receive a message / action
    socket.onmessage = res => {
        let data = JSON.parse( res.data );
        switch ( data.type ) {
            case "giveTurn": {
                if ( data.id === playerId ) {
                    changeIsGoing( true );
                }
                if ( html.dataset.isbanker === "true" ) {
                    let infos = document.getElementsByClassName( "playerInfo" );
                    let playerMoves = document.getElementsByClassName( "playerMove" );
                    //change going player in players money page
                    for ( let i = 0; i < infos.length; i++ ) {
                        if ( infos[ i ].classList.contains( "going" ) ) {
                            infos[ i ].classList.remove( "going" );
                        }
                        if ( infos[ i ].dataset.id === data.id ) {
                            infos[ i ].classList.add( "going" );
                        }
                        if ( playerMoves[ i ].getElementsByClassName( "sndMoveRow" )?.[ 0 ].classList.contains( "going" ) ) {
                            playerMoves[ i ].getElementsByClassName( "sndMoveRow" )?.[ 0 ].classList.remove( "going" );
                            playerMoves[ i ].getElementsByClassName( "sndMoveRow" )?.[ 0 ].classList.add( "not-going" );
                        }
                        if ( playerMoves[ i ].dataset.id === data.id ) {
                            playerMoves[ i ].getElementsByClassName( "sndMoveRow" )?.[ 0 ].classList.add( "going" );
                            playerMoves[ i ].getElementsByClassName( "sndMoveRow" )?.[ 0 ].classList.remove( "not-going" );
                        }
                    }
                }
                break;
            }
            case "giveMoney": {
                if ( !data.redo ) {
                    if ( data.for === playerId ) {
                        money.innerText = +money.innerText + data.total;
                    }
                } else {
                    if ( data.for === playerId ) {
                        money.innerText = ( +money.innerText - data.total ).toString();
                    } else if ( data.from === playerId ) {
                        money.innerText = +money.innerText + data.total;
                    }
                }
                if ( html.dataset.isbanker === "true" ) {
                    if ( !data.bankerMove ) {

                        let playerMoves = document.getElementsByClassName( "playerMove" );
                        for ( let i = 0; i < playerMoves.length; i++ ) {
                            if ( playerMoves[ i ].dataset.id === data.from ) {
                                updateMove( playerMoves[ i ], data );
                                if ( !data.redo ) {
                                    changeMovesCount( playerMoves[ i ].querySelector( ".moveCont" ) );
                                }
                            }
                        }
                    }
                }
                let fromMoneySpan = document.getElementById( data.from + "money" );
                let forMoneySpan = document.getElementById( data.for + "money" );
                if ( data.for !== "bank" ) {
                    forMoneySpan.innerText = ( +forMoneySpan.innerText + ( data.redo ? -data.total : +data.total ) ).toString();
                }
                if ( !data.bankerMove ) {
                    fromMoneySpan.innerText = ( +fromMoneySpan.innerText + ( data.redo ? +data.total : -data.total ) ).toString();
                }
                break;
            }
            case "gotCircle": {
                if ( html.dataset.isbanker === "true" ) {
                    let moneySpan = document.getElementById( data.from + "money" );
                    moneySpan.innerText = ( +moneySpan.innerText + ( data.redo ? -parseInt( startSettings.moneyForCircle ) : +parseInt( startSettings.moneyForCircle ) ) ).toString();
                    let playerMoves = document.getElementsByClassName( "playerMove" );
                    for ( let i = 0; i < playerMoves.length; i++ ) {
                        if ( playerMoves[ i ].dataset.id === data.from ) {
                            updateMove( playerMoves[ i ], data );
                            if ( !data.redo ) {
                                changeMovesCount( playerMoves[ i ].querySelector( ".moveCont" ) );
                            }
                        }
                    }
                }
                if ( data.redo && data.from === playerId ) {
                    document.getElementById( "gotCircle" ).disabled = getIsGoing();
                    turnsBeforeNewCircle = 0;
                    money.innerText = ( +money.innerText + -parseInt( startSettings.moneyForCircle ) ).toString();
                }
                break;
            }
            case "closeRoom": {
                if ( data.gameId && data.gameId === gameId && data.winners ) {
                    showMessage( "Your game has ended", createWinnerMsg( data.winners || [] ) );
                    document.getElementById( "changePlayer" ).onclick = () => ( document.location = "/" );
                    document.getElementById( "changePlayer" )?.remove()
                    document.getElementById( "giveUp" )?.remove()
                    document.getElementById( "closeRoom" )?.remove()
                }
                break;
            }
            case "confirmPick": {
                const connectionLabel = document.getElementById( "isConnected" );
                connectionLabel.innerText = "You are connected";
                connectionLabel.classList.add( "connected" );
                connectionLabel.classList.remove( "not-connected" );
                isInitialized = true;
                break;
            }
            case "deletePlayer": {
                const playerId = data.id;

                if ( playerId ) {
                    const playersInfos = document.getElementsByClassName( "playerInfo" );

                    for ( const playerInfo of playersInfos ) {
                        if ( playerInfo.dataset.id === playerId ) {
                            playerInfo.remove();
                        }
                    }

                    const playersMoves = document.getElementsByClassName( "playerMove" );

                    for ( const playerMove of playersMoves ) {
                        if ( playerMove.dataset.id === playerId ) {
                            playerMove.remove();
                        }
                    }
                }
            }
        }
    };
    //works when web socket close connection
    socket.onclose = () => {
        const connectionLabel = document.getElementById( "isConnected" );
        connectionLabel.innerText = "You are not connected";
        connectionLabel.classList.remove( "connected" );
        connectionLabel.classList.add( "not-connected" );

        setTimeout( openSocket, 1000 );
    };
};
openSocket();

//* Event handlers //

//go to "player-pick monitor"
let signOut = () => {
    document.location = "/" + gameId;
    axios.get( concatURL( document.location.origin, gameId, "unpick-player", `?id=${playerId}` ) )
};
//close room for all players
let closeRoom = () => {
    timerSpan && timerSpan.remove();
    socket.send( JSON.stringify( {
        type: "closeRoom",
        gameId,
    } ) )
}
let giveUp = () => {
    if ( getIsGoing )
        giveTurn();
    axios.put( concatURL( document.location.origin, gameId, "players/lost", `?playerId=${playerId}` ) )
        .then( res => {
            if ( !res.data.error ) {
                removePlayerControls();
                afterLostOptions();
            } else {
                appendNotification( res.data.error )
            }
        } )
}

//func while you got circle
let gotCircleHandler = () => {
    if ( turnsBeforeNewCircle === 0 ) {
        let action = {
            type: "gotCircle",
            from: playerId,
            redo: false
        };
        axios.put( concatURL( document.location.origin, gameId, "moneyActions", `?playerId=${playerId}` ), action )
            .then( res => {
                if ( res.data.error ) {
                    appendNotification( res.data.error );
                } else {
                    money.innerText = res.data;
                    socket.send( JSON.stringify( action ) );
                    turnsBeforeNewCircle = 1;
                    giveTurn();
                }
            } );
    } else {
        appendNotification( "Calm down you get circles too fast", "warn" );
    }
};
//give turn to next player
let giveTurn = () => {
    axios.get( concatURL( document.location.origin, gameId, "giveTurn", `?playerId=${playerId}` ) )
        .then( res => {
            if ( !res.data.error && res.data.nextGoing ) {
                turnsBeforeNewCircle = res.data.turns;
                if ( turnsBeforeNewCircle >= 0 ) {
                    if ( document.getElementById( "gotCircle" ) )
                        document.getElementById( "gotCircle" ).disabled = true;
                } else {
                    if ( document.getElementById( "gotCircle" ) )
                        document.getElementById( "gotCircle" ).disabled = false;
                }

                socket.send( JSON.stringify( {
                    type: "giveTurn",
                    id: res.data.nextGoing
                } ) );

                changeIsGoing( false );
            } else {
                appendNotification( res.data.error || "Can't find next going player" );
            }
        } );
};

//switch banker`s pages
let optionAction = ( e ) => {
    document.getElementsByClassName( "active" )[ 0 ].classList.remove( "active" );
    e.target.classList.add( "active" );
    if ( document.getElementById( "playersMoney" ) )
        document.getElementById( "playersMoney" ).style.display = "none";
    if ( document.getElementById( "playerControls" ) )
        document.getElementById( "playerControls" ).style.display = "none";
    if ( document.getElementById( "moveLog" ) )
        document.getElementById( "moveLog" ).style.display = "none";
    switch ( e.target.id ) {
        case "yourControlsBtn": {
            document.getElementById( "playerControls" ).style.display = "flex";
            break;
        }
        case "otherPlayersBtn": {
            document.getElementById( "playersMoney" ).style.display = "flex";
            break;
        }
        case "moveLogBtn": {
            document.getElementById( "moveLog" ).style.display = "flex";
            break;
        }
    }
};

//works on click on player in pay list
let onReceiverPick = ( e ) => {
    let moneyCount = input.value;
    bgCont.style.display = "none";
    document.getElementById( "pick-player-to-pay" ).style.display = "none";
    input.value = "";
    axios.put( `${protocol}//${host}/${gameId}/moneyActions?playerId=${playerId}`, {
        type: "giveMoney",
        total: +moneyCount,
        for: e.target.id,
        redo: false,
        from: playerId
    } ).then( res => {
        if ( !res.data.error ) {
            socket.send( JSON.stringify( {
                type: "giveMoney",
                for: e.target.id,
                total: +moneyCount,
                from: playerId,
                redo: false
            } ) );
            money.innerText = res.data;
        } else {
            appendNotification( res.data.error );
        }
    } );
    document.getElementsByClassName( "bg-cont" )?.[ 0 ]?.removeEventListener( "click", closeModal );
};

//check how many moves more on hover
let hoverCount = ( e ) => {
    if ( e.target.children[ 0 ] ) {
        if ( e.type === "mouseover" ) {
            e.target.children[ 0 ].style.display = "inline";
            let conts = document.getElementsByClassName( "delete" );
            for ( let i = 0; i < conts.length; i++ ) {
                if ( conts[ i ] !== e.target ) {
                    conts[ i ].style.visibility = "hidden";
                }
            }
        } else if ( e.type === "mouseout" ) {
            e.target.children[ 0 ].style.display = "none";
            let conts = document.getElementsByClassName( "delete" );
            for ( let i = 0; i < conts.length; i++ ) {
                if ( conts[ i ] !== e.target ) {
                    conts[ i ].style.visibility = "visible";
                }
            }
        }
    }
};

//change players money in players money page
let changePlayerMoney = ( e ) => {
    if ( e.target.children.length > 0 ) {
        let oldMoney = e.target.children[ 1 ];
        let width = oldMoney.offsetWidth;
        let playerCont = e.target;
        let newMoney = document.createElement( "input" );
        newMoney.type = "number";
        newMoney.autofocus = true;
        newMoney.style.display = "inline";
        newMoney.style.width = ( width + 20 ) + "px";
        newMoney.defaultValue = oldMoney.innerText;
        newMoney.classList.add( "newMoney" );
        playerCont.replaceChild( newMoney, oldMoney );
        let btnCont = document.createElement( "div" );
        btnCont.classList.add( "btnCont" );
        let confirmBtn = document.createElement( "button" );
        confirmBtn.classList.add( "confirm" );
        confirmBtn.innerText = "Update";
        confirmBtn.addEventListener( "click", ( e ) => {
            confirmUpdate( e, oldMoney );
        } );
        let backBtn = document.createElement( "button" );
        backBtn.classList.add( "back" );
        backBtn.innerText = "Back";
        backBtn.addEventListener( "click", ( e ) => {
            backFromUpdate( e, oldMoney );
        } );
        btnCont?.appendChild( confirmBtn );
        btnCont?.appendChild( backBtn );
        let newPlayerCont = document.createElement( "form" );
        newPlayerCont.classList.add( "changeMoneyForm" );
        newPlayerCont?.appendChild( playerCont.cloneNode( true ) );
        newPlayerCont?.appendChild( btnCont );
        newPlayerCont.onsubmit = ( e ) => {
            confirmUpdate( e, oldMoney );
        };
        playerCont.parentElement.replaceChild( newPlayerCont, playerCont );
    }
};

let closeModal = ( { target: modal } ) => {
    modal.style.display = "none";
}
let propagationStopper = ( e ) => e.stopPropagation();
let toggleMenu = ( e ) => {
    toggleMenuCont.classList.toggle( "changed" );
}

//* Apply event listeners
document.getElementById( "changePlayer" )?.addEventListener( "click", signOut );
document.getElementById( "closeRoom" )?.addEventListener( "click", closeRoom );
document.getElementById( "gotCircle" )?.addEventListener( "click", gotCircleHandler );
document.getElementById( "nextPlayer" )?.addEventListener( "click", giveTurn );
document.getElementById( "pick-player-to-pay" )?.addEventListener( "click", propagationStopper );
document.getElementById( "menu" )?.addEventListener( "click", propagationStopper );
document.getElementById( "toggleMenuBtn" )?.addEventListener( "click", propagationStopper );
document.getElementById( "giveUp" )?.addEventListener( "click", giveUp );
document.getElementById( "toInitPage" )?.addEventListener( "click", () => document.location = "/" );
reduceBtn?.addEventListener( "click", openReceiverPickerModal );
toggleMenuBtn.addEventListener( "click", toggleMenu );
document.addEventListener( "click", toggleMenu );
//give actions to options
if ( options ) {
    for ( const option of options ) {
        option.addEventListener( "click", ( e ) => {
            optionAction( e );
        } );
    }
}
if ( playersToPick ) {
    for ( const playerToPick of playersToPick ) {
        playerToPick.onclick = onReceiverPick;
    }
}
if ( isBanker ) {
    if ( playersMoves )
        for ( const playerMove of playersMoves ) {
            if ( playerMove.dataset.move ) {
                activateMove( playerMove );
            }
        }
    if ( playersInfos )
        for ( const playerInfo of playersInfos ) {
            playerInfo.onclick = changePlayerMoney;
        }
}

//* Timer stuff
if ( timerSpan && startSettings.isMaxTimeOn && startSettings.maxTime ) {
    const getHours = ( time ) => {
        const allSeconds = time / 1000;
        const seconds = getSeconds( time );
        const minutes = getMinutes( time );
        return ~~( allSeconds - seconds - minutes * 60 ) / 60 / 60;
    }
    const getMinutes = ( time ) => {
        const allSeconds = time / 1000;
        const seconds = getSeconds( time );
        const minutes = ( allSeconds - seconds ) / 60;
        return ~~minutes % 60;
    }
    const getSeconds = ( time ) => {
        const seconds = time / 1000;
        return ~~( seconds % 60 ); //~~ - to integer;
    }
    const getTimeStr = ( time ) => `${getHours( time )}:${getMinutes( time )}:${getSeconds( time )}`
    const getTime = () => startSettings.maxTime - ( Date.now() - createdAt );
    const changeTime = ( timeStr ) => timerSpan && ( timerSpan.innerText = timeStr );
    const checkTimer = ( time ) => {
        if ( time <= 0 ) {
            clearInterval( timerInterval );
        }
        else {
            changeTime( getTimeStr( time ) );
        }
    }
    checkTimer( getTime() );
    const timerInterval = setInterval( () => checkTimer( getTime() ), 1000 );
}

//* Initialize
//get players
axios.get( concatURL( document.location.origin, gameId, "players" ) )
    .then( res => {
        players = res.data.players;
        if ( players ) {
            players.forEach( e => {
                if ( e._id === playerId ) {
                    if ( e.isPicked && !isInitialized ) {
                        document.querySelector( ".message" ).style.visibility = "visible";
                        document.querySelector( ".userContent" ).remove();
                    } else {
                        document.querySelector( ".userContent" ).style.visibility = "visible";
                        document.querySelector( ".message" ).remove();
                    }
                }
            } );
        }
    } );
function removePlayerControls () {
    if ( document.getElementById( "playerControls" ) )
        document.getElementById( "playerControls" ).remove();
}

