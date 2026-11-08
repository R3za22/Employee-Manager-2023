let employees = [
  {
  name : "محمد",
  lastname : "بهرامی",
  id: 670531 ,
  idmeli: 1001234567,
  group : 1,
  status : true
  },{
  name : "احمد",
  lastname : "محمدی",
  id: 711234 ,
  idmeli: 1002469134,
  group : 1,
  status : true
  },{
  name : "سینا",
  lastname : "سرلک" ,
  id: 577890 ,
  idmeli: 1003703701,
  group : 2,
  status : true
  },{
  name : "بهداد",
  lastname : "حامد" ,
  id: 511499  ,
  idmeli: 1004938268 ,
  group : 1,
  status : true
  },{
  name : "احسان",
  lastname : "کریم زاده" ,
  id: 750655  ,
  idmeli: 1006172835,
  group : 3,
  status : false
  },{
  name : "زهرا",
  lastname : "احسانی" ,
  id: 728780  ,
  idmeli: 1007407402 ,
  group : 3,
  status : true
  },{
  name : "احمد",
  lastname : "سرلک" ,
  id: 462180  ,
  idmeli: 1008641969,
  group : 2,
  status : true
  },{
  name : "معصومه",
  lastname : "زهرایی" ,
  id: 525103   ,
  idmeli: 1009876536 ,
  group : 3,
  status : true
  },{
  name : "کریم",
  lastname : "معصومی" ,
  id: 596827   ,
  idmeli: 1011111103,
  group : 1,
  status : true
  },{
  name : "عظیم",
  lastname : "کریمی" ,
  id: 298651  ,
  idmeli: 1012345670 ,
  group : 3,
  status : false
  },{
  name : "حامد",
  lastname : "عظیمی" ,
  id: 310834  ,
  idmeli: 1013580237,
  group : 4,
  status : true
  },{
  name : "عباس",
  lastname : "سرلک" ,
  id: 871502  ,
  idmeli: 1014814804,
  group : 2,
  status : true
  },{
  name : "حمید",
  lastname : "حامدی" ,
  id: 269474  ,
  idmeli: 1016049371,
  group : 4,
  status : true
  },{
  name : "عباس",
  lastname : "حمیدی" ,
  id: 627615  ,
  idmeli: 1017283938 ,
  group : 3,
  status : false
  },{
  name : "رضا",
  lastname : "محمدی" ,
  id: 465164  ,
  idmeli: 1018518505 ,
  group : 4,
  status : true
  }
]




// GET ELEMENT - TOOLS   

const getElement = (selection) => {
  const element = document.querySelector(selection)
  if (element) return element
  // throw new Error(`Please check "${selection}" selector, no such element exist`)
}

const getElements = (selection) => {
  const element = document.querySelectorAll(selection)
  if (element) return element
  throw new Error(`Please check "${selection}" selector, no such element exist`)
}




// ---------------------------------------------------   EMPLOYEEES LIST -------------------------------------------------------------

let editedemployee ;
const addbtn = getElement('.add-btn');



const melicheck = (meli) => {

  const idmeliarray = meli.split('');


  if (!idmeliarray.length==10){
    return false
  }  

  let revcount = 11
  let result = 0;
  const control = idmeliarray[9];
  idmeliarray.map((e)=>{
    revcount--;
    if(revcount>1)
      result += e*revcount;
  })

  const leftover = result%11;

  if(leftover < 2)
  {
    if(leftover == control)
    {
      console.log("winners winning wins")
      return true;
    }
    else
    {
      console.log("weeee LOOOOSSST ZZOOOLLLOOOOOLLLLL")
      return false;
    }
  }else if(leftover > 2){
    if(11 - leftover == control)
    {
      console.log("winners winning wins")
      return true;
    }
    else
    {
      console.log("weeee LOOOOSSST ZZOOOLLLOOOOOLLLLL")
      return false;
    }

  }
}

function containsNumbers(str) {
  return /\d/.test(str);
}




addbtn.addEventListener('click',()=>{

  const editname =  getElement('.form-edit-name');               const namee = editname.value;
  const editlastname =  getElement('.form-edit-lastname');       const lastnamee = editlastname.value;
  const editid =  getElement('.form-edit-id');                   const ide = editid.value;
  const editidmeli=  getElement('.form-edit-meliid');            const idmelie = editidmeli.value;   //this
  const editgroup =   getElement('.form-edit-group');            const groupe = editgroup.value;
  const editcheckbox =   getElement('.form-edit-checkbox');      const statuse = editcheckbox.checked;



   
  if(namee== "" || lastnamee=="" || ide=="" || idmelie==""){
    alert("There Was No Input");
    return;
  }

  if(containsNumbers(namee)){
    alert("There are numbers in name input");
    return;
  }

  if(containsNumbers(lastnamee)){
    alert("There are numbers in last name input");
    return;
  }

  if(!melicheck(idmelie)){
    alert("Code Meli is Wrong");
    return;
  }
  
  

  if(!addbtn.classList.contains("edit-mode"))
  { 
  employees.push({name : namee , lastname : lastnamee , id : ide , idmeli : idmelie , group : groupe , status : statuse})
  printtable(employees);
  }

  else if (addbtn.classList.contains("edit-mode"))
  {
    let employees2 = employees.map((e)=>{
      let { name, lastname, id, idmeli , group , status} = e;
      if(id == editedemployee)
        e = {name : namee , lastname : lastnamee , id : ide , idmeli : idmelie , group : groupe , status : statuse};
      return e;
    })

    employees = employees2;
    printtable(employees);
    addbtn.classList.remove("edit-mode");
    addbtn.textContent = "اضافه کردن";

    editname.value = "";
    editlastname.value = "";
    editid.value = "";
    editidmeli.value = "";
    editgroup.value = "";
    editcheckbox.checked = "";

  }

})







const deletelisteners = () =>{
  const deletebtns = getElements('.delete-btn');
  const deletebtnsarray = [...deletebtns];
  deletebtnsarray.map((e)=>{
    e.addEventListener('click', () => {
      const selectedid =  e.parentElement.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.textContent;
      let employees2 = employees.filter((e)=>{
        const { name, lastname, id, idmeli , group , status} = e;
        if(id != selectedid)
          return e;
      })
      employees = employees2; 
      printtable(employees);
    });
  })
}


const editlisteners = () =>{
  const editbtns = getElements('.edit-btn');
  const editbtnsarray = [...editbtns];
  editbtnsarray.map((e)=>{
    e.addEventListener('click', () => {
      const selectedid =  e.parentElement.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.textContent;
      let employees2 = employees.map((e)=>{
        const { name, lastname, id, idmeli , group , status} = e;
        if(id == selectedid)
          {
            const editname =  getElement('.form-edit-name');               editname.value = name;
            const editlastname =  getElement('.form-edit-lastname');       editlastname.value = lastname;
            const editid =  getElement('.form-edit-id');                   editid.value = id;
            const editidmeli=  getElement('.form-edit-meliid');            editidmeli.value = idmeli;
            const editgroup =   getElement('.form-edit-group');            editgroup.value = group;
            const editcheckbox =   getElement('.form-edit-checkbox');      editcheckbox.checked = status;

            addbtn.classList.add("edit-mode");
            addbtn.textContent = "تغییر دادن";
            editedemployee = id;

          }
      })
    });
  })
}




const printtable = (list) => {
  const table = getElement('.table-body');
  table.innerHTML = list.map((e) => {
    let { name, lastname, id, idmeli , group , status} = e;

    if (status)
    {status = "فعال"}
    else
    {status = "غیر فعال"}

    return `<tr>
    <td class="icons-ts">
    <a href="#/" class="delete-btn" aria-label="حذف"><i class="fa fa-times"></i></a>
    <a href="#/" class="edit-btn" aria-label="ویرایش"><i class="fa fa-pen"></i></a>
    </td>
    <td>${status}</td>
    <td>${group}</td>
    <td>${idmeli}</td>
    <td>${id}</td>
    <td>${lastname}</td>
    <td>${name}</td>


  </tr>`;
  })
  .join('');

  deletelisteners();
  editlisteners();
}





printtable(employees);





// ----------------------------------------    id and code meli search  -----------------------------------------



const idsearchbtn = getElement('.id-search-btn');
const idsearchinput = getElement('.id-search');
const idsearchresult = getElement('.search-result-id');

idsearchbtn.addEventListener('click',()=>{
  const input = idsearchinput.value;
  let found = false ;



  idsearchresult.innerHTML = employees.map((e)=>{
    let { name, lastname, id, idmeli , group , status} = e;

    if (status)
    {status = "فعال"}
    else
    {status = "غیر فعال"}


    if(lastname == input || idmeli == input){

      found = true;
      return `<div class="search-result-id-div">
      <p><span class="search-result-id-span">نام : </span> ${name}</p>
      <p><span class="search-result-id-span">نام خانوادگی :</span> ${lastname}</p>
      <p><span class="search-result-id-span">شماره پرسنلی : </span> ${id}</p>
      <p><span class="search-result-id-span">کد ملی : </span> ${idmeli}</p>
      <p><span class="search-result-id-span">دسته کاری : </span> ${group}</p>
      <p><span class="search-result-id-span">وضعیت : </span> ${status}</p>
    </div>`
    }

  }).join('');


  if (!found)
  {
    idsearchresult.innerHTML = `<h3 class="search-result-id-span">نتیجه‌ای یافت نشد</h3>` ;
  }
})



// ----------------------------------------    WTF  -----------------------------------------



let table2;
const yearelement = getElements('.drop-input-year');
const yearelements = [...yearelement];
yearelements.map((e)=>{
  for (let a = 1350 ; a <= 1450 ; a++) {
    if(a == 1401)
      e.innerHTML+= `<option value="${a}" selected>${a}</option>`;
    else
      e.innerHTML+= `<option value="${a}">${a}</option>`;
  }
})

const daynumelement = getElement('.drop-input-daynum');
for (let a = 1 ; a <= 31 ; a++) {
  daynumelement.innerHTML+= `<option value="${a}">${a}</option>`;
}

// ------------------------------------------------------------  wtf  1  -------------------------------------------------

const printtable2 = () => {
  const table = getElement('.table-body2');
  table.innerHTML = "";

  
  const year = yearelements[0].value;
  const day = getElement('.drop-input-day').value;
  const kabise = getElement('.drop-input-kabise').value;

  let counter = 365;

  if(kabise == 'true' )
  { counter = 366; }

  let half = false;

  let sh1 = 1 , sh2 = 2 , sh3 = 4 , sh4 = 3;
  

  for(let a=1 , b = 1 , c , d=day; a <= counter ; ++a , ++d)
  {

    { 
      if(a>186)
      {half = true}
    }

    { 
      if(d>7)
      {d=1}
    }

    let  dayname ;

      
    {
      if(d==1)
        dayname = "شنبه";
      else if(d==2)
        dayname = "یک شنبه";
      else if(d==3)
        dayname = "دو شنبه";
      else if(d==4)
        dayname = "سه شنبه";
      else if(d==5)
        dayname = "چهار شنبه";
      else if(d==6)
        dayname = "پنج شنبه";
      else if(d==7)
        dayname = "جمعه";
    
    }
      

  

      if(!half){
      b = Math.ceil(a/31);
      c = (a+31) - (b*31);}
      else{
        let a2 = a-186;
        b = 6 + Math.ceil(a2/30)
        c = ((a2+30) - ((b-6)*30))
      }

      

      if(a>1 && a%2==1){
      let temp = sh4;
      sh4 = sh3;
      sh3 = sh2;
      sh2 = sh1;
      sh1 = temp ;
      }

    

      table.innerHTML+=
      `
      <tr>
      <td><p>روزکار</p></td>
      <td>${sh1}</td>
      <td class="bold" >${dayname}</td>
      <td><p class="bold" >${year}/${Math.ceil(b)}/${c}</p></td>
      </tr>
      <tr>
      <td><p>شبکار</p></td>
      <td>${sh2}</td>
      <td></td>
      <td></td>
      </tr>

      <tr>
      <td><p>استراحت</p></td>
      <td>${sh4}</td>
      <td></td>
      <td></td>
      </tr>

      <tr>
      <td><p>استراحت</p></td>
      <td>${sh3}</td>
      <td></td>
      <td></td>
      </tr>
      `
      ;
    }

  }

// ------------------------------------------------------------  wtf  2  -------------------------------------------------

const printtable3 = () => {
  const table = getElement('.table-body2');
  table.innerHTML = "";

  
  const year = yearelements[1].value;
  const months = getElement('.drop-input-months').value;
  const daynum = getElement('.drop-input-daynum').value;
 

  const idsearchinput2 = getElement('.id-search-2').value;
  const foundemp = employees.find( e => {
    if (e.id == idsearchinput2 || e.idmeli == idsearchinput2)
      {
        console.log("emp found");
        return e;
      }
    else{
      console.log("emp not found");
    }
  })

  if(foundemp)
  {
    const inputdate = ((year*10000)+(months*100)+(daynum*1));

    console.log(inputdate);
    console.log(year , months , daynum );
    
  
    let half = false;
    let sh1 = 1 , sh2 = 2 , sh3 = 4 , sh4 = 3;
    
    for(let a=1 , b = 1 , c , d=3; a <= 365 ; ++a , ++d)
    {
  
      { 
        if(a>186)
        {half = true}
      }
  
      { 
        if(d>7)
        {d=1}
      }
  
      let  dayname ;
  
      {
        if(d==1)
          dayname = "شنبه";
        else if(d==2)
          dayname = "یک شنبه";
        else if(d==3)
          dayname = "دو شنبه";
        else if(d==4)
          dayname = "سه شنبه";
        else if(d==5)
          dayname = "چهار شنبه";
        else if(d==6)
          dayname = "پنج شنبه";
        else if(d==7)
          dayname = "جمعه";
      
      }
        
  
        if(!half){
        b = Math.ceil(a/31);
        c = (a+31) - (b*31);}
        else{
          let a2 = a-186;
          b = 6 + Math.ceil(a2/30)
          c = ((a2+30) - ((b-6)*30))
        }
  
        if(a>1 && a%2==1){
        let temp = sh1;
        sh1 = sh2;
        sh2 = sh4;
        sh4 = sh3;
        sh3 = temp ;
        }
  
        const date = { d : ((year*10000)+(Math.ceil(b)*100)+(c)) ,  g1 : sh1 , g2 : sh2 , g3 : sh3 , g4 : sh4 , shift : a%2 }


  
        if(date.d == inputdate)
        {

          let shift ;

          if(foundemp.group == 1){
          shift = date.g1
          console.log(date.g1 , "1")
          }
          else if(foundemp.group == 2){
          shift = date.g2
          console.log(date.g2 , "2")
          }
          else if(foundemp.group == 3){
          shift =  date.g3
          console.log(date.g3 , "3")
          }
          else if(foundemp.group == 4){
          shift = date.g4
          console.log(date.g4 , "4")
          }


          let shiftname ;
          let shiftnamecount;

          if (shift == 1 )
          {
            shiftname = "صبحکاری"
          }else if (shift == 2 )
          {
            shiftname = "شبکاری"
          }else if(shift == 3 || shift == 4)
          {
            shiftname = "استراحت"
          }

          if(shift <= 3){
            if(date.shift == 1)
              shiftnamecount = "اول";
            else if(date.shift == 0){
              shiftnamecount = "دوم";
            }
          }else if(shift == 4){
            if(date.shift == 1)
            shiftnamecount = "سوم";
          else if(date.shift == 0){
            shiftnamecount = "چهارم";
          }
          }




          table.innerHTML+=      `
          <tr>
          <td><p>${shift}</p></td>
          <td><p>${foundemp.group}</p></td>
          <td class="bold" >${dayname}</td>
          <td><p class="bold" >${year}/${Math.ceil(b)}/${c}</p></td>
          </tr>
          `;

          const resultdiv = getElement('.search-result-wtf')
          resultdiv.innerHTML = `<div class="search-result-id-div">
          <p><span class="search-result-id-span wtf-color-2">نام : </span>${foundemp.name}</p>
          <p><span class="search-result-id-span wtf-color-2">نام خانوادگی : </span>${foundemp.lastname}</p>
          <p><span class="search-result-id-span wtf-color-2">شماره پرسنلی : </span>${foundemp.id}</p>
          <p><span class="search-result-id-span wtf-color-2">کد ملی : </span>${foundemp.idmeli}</p>
          <p><span class="search-result-id-span wtf-color-2">دسته کاری : </span>${foundemp.group}</p>
          <p><span class="search-result-id-span wtf-color-2">-------</span></p>
          <p><span class="search-result-id-span wtf-color-2">شیفت : </span> ${shiftname}  -  ${shiftnamecount}</p>
          </div>`;

          break;
        }

        const resultdiv = getElement('.search-result-wtf')
        resultdiv.innerHTML = `<div class="search-result-id-div search-result-div-error">نتیجه‌ای یافت نشد</div>`;

      }
   
  }
  else{
    const resultdiv = getElement('.search-result-wtf')
    resultdiv.innerHTML = `<div class="search-result-id-div search-result-div-error">نتیجه‌ای یافت نشد
    </div>`;
  }
  


  }



const wtfbtn = getElement('.wtf-btn');
wtfbtn.addEventListener('click',printtable2)


const wtfbtn2 = getElement('.wtf-btn-2');
wtfbtn2.addEventListener('click',printtable3)

const wtfswitch = getElements('.wtf-switch');
const wtfswitchs = [...wtfswitch];
wtfswitchs.map((e)=>{
  e.addEventListener('click',()=>{
    console.log("switch")
    const nothidden = getElement('.searching-box-show');

    let hidden = getElement('.searching-box-hide');
    let hidden2 = getElement('.searching-box-hide2');
    
    const table = getElement('.wtf-table');

    table.classList.toggle("wtf-table-color-2");

    if(hidden){

      nothidden.classList.add("searching-box-hide2");
      nothidden.classList.remove("searching-box-show");
     
      hidden.classList.remove("searching-box-hide");
      hidden.classList.add("searching-box-show");  

    }else if(hidden2){

      nothidden.classList.add("searching-box-hide");
      nothidden.classList.remove("searching-box-show");
     
      hidden2.classList.remove("searching-box-hide2");
      hidden2.classList.add("searching-box-show");

    }


  })
})





