function showToast(message,type="success"){

const toast=document.createElement("div");

toast.innerHTML=message;

toast.style.position="fixed";
toast.style.top="30px";
toast.style.right="30px";
toast.style.padding="18px 25px";
toast.style.borderRadius="15px";
toast.style.color="#fff";
toast.style.fontWeight="700";
toast.style.zIndex="99999";
toast.style.boxShadow="0 15px 30px rgba(0,0,0,.2)";
toast.style.transition=".4s";
toast.style.opacity="0";
toast.style.transform="translateY(-20px)";

if(type=="success"){

toast.style.background="#16a34a";

}

if(type=="error"){

toast.style.background="#dc2626";

}

if(type=="warning"){

toast.style.background="#f59e0b";

}

document.body.appendChild(toast);

setTimeout(()=>{

toast.style.opacity="1";
toast.style.transform="translateY(0)";

},100);

setTimeout(()=>{

toast.style.opacity="0";
toast.style.transform="translateY(-20px)";

setTimeout(()=>{

toast.remove();

},500);

},3000);

}