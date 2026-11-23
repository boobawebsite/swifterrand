function go(url){

document.body.style.opacity="0";

setTimeout(()=>{

window.location=url;

},500);

}

window.onload=function(){

document.body.style.opacity="1";

document.body.style.transition=".5s";

}