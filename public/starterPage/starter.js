let height = document.documentElement.clientHeight;
let html = document.getElementsByTagName("html")[0];
let container = document.getElementsByClassName("container")[0];
html.style.height = height + "px";
container.style.height = height + "px";
let textWidth = document.getElementsByTagName("p")[0].offsetWidth;
let btn = document.getElementById("createNewRoomBtn");
btn.style.width = textWidth+"px";
btn.addEventListener("click",()=>{
   axios.post(document.location.href).then(res=>{
       document.location.replace(`${document.location.href}${res.data}/starter-settings`);
   })
});

