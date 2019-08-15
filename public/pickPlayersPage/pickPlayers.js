let playersCont = document.getElementById("players-cont");

let ids = [];

document.getElementById("url").innerText = "Ссылка на игру - " + document.location.href;

let newPlayer = (playerData) => {
    let player = document.createElement("div");
    player.classList.add("player");
    player.classList.add("center");
    ids.push(playerData._id);
    // link.href = `${document.location.href}?playerId=${playerData.id}`;
    player.innerText = playerData.name;
    player.addEventListener("click", (e) => {
        onPlayerPick(e);
    });
    playersCont.appendChild(player);
};

if (playersCont) {
    axios.get(`${document.location.href}players`).then(res => {
        res.data.forEach(player => {
            newPlayer(player);
        });
    });
}

let onPlayerPick = (e) => {
    let id = null;
    let players = document.getElementsByClassName("player");
    for (let i = 0; i < players.length; i++) {
        if(players[i] === e.target){
            id = ids[i];
        }
    }
    axios.get(`${document.location.href}players?id=${id}`).then(res => {
        if(!res.data.error) {
            if(res.data.isPicked) {
               e.preventDefault();
               alert("This player is already picked");
            }else{
                document.location.replace(`?playerId=${id}`);
                axios.get(`${document.location.href}pick-player?id=${id}`);
            }
        }else{
            alert(res.data.error);
        }
    })
};
