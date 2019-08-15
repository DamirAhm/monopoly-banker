//set window size by screen size
let height = document.documentElement.clientHeight;
let html = document.getElementsByTagName("html")[0];
let container = document.getElementsByClassName("container")[0];
html.style.height = height + "px";
if(container) {
    container.style.height = height + "px";
}