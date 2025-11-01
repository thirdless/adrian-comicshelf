const PER_PAGE = 9;

let current_display = 0,
    search_enabled = 0,
    collections_array,
    subcollections_array,
    collections_el = document.querySelector(".collections"),
    subcollection_el = document.querySelector(".subcollection"),
    more_button = document.querySelector(".more"),
    search_el = document.querySelector(".search"),
    search_bar = document.querySelector(".search input"),
    return_button = document.querySelector(".return"),
    previous_more_button_state;


more_button.style.display = "none";
subcollection_el.style.display = "none";

function sleep(time){
    return new Promise(acc => setTimeout(acc, time));
}

function getJson(){
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "comics.json", true);
    return new Promise((acc, rej) => {
        xhr.onreadystatechange = function(){
            if(xhr.readyState === 4 && xhr.status === 200){
                acc(xhr.responseText);
            }
            else if(xhr.readyState === 4){
                rej(xhr.responseText);
            }
        }

        xhr.send();
    });
}

async function getComics(){
    let data;
    
    try{
        data = await getJson();
        data = JSON.parse(data);
        collections_array = data.collections;
        subcollections_array = data.subcollections;
    }
    catch{
        alert("Error while getting data.");
        return;
    }

    search_enabled = 1;
    more_button.style.display = "";
    displayCollections();
}

function getIcon(type){
    let icon = "";

    switch(type){
        case "autor":
            icon = "user";
            break;
        case "colectie":
            icon = "layers";
            break;
        case "isbn":
            icon = "at-sign";
            break;
        case "editura":
            icon = "pen-tool";
            break;
        case "locatie":
            icon = "map-pin";
            break;
    }

    return "<svg><use href='#icon-" + icon + "'></use></svg>";
}

function generateCollection(data_input, search_subcollection = 0){
    let collection = document.createElement("div"),
        details = document.createElement("div"),
        image = document.createElement("img"),
        title = document.createElement("h1"),
        data = structuredClone(data_input);

    collection.className = "collection";
    details.className = "details";
    image.src = "collection-images/" + data.id + ".jpg";
    title.innerHTML = data.titlu;

    collection.setAttribute("data-collection-id", data.id);

    if(search_subcollection){
        let found_collection = findCollection(data.colectie);

        image.src = "subcollection-images/" + data.id + ".jpg";
        collection.setAttribute("data-collection-id", data.colectie);
        collection.classList.add("sub-search");
        
        if(found_collection !== -1){
            data.colectie = found_collection.titlu;
        }
    }

    collection.appendChild(image);
    collection.appendChild(details);
    details.appendChild(title);

    for(let key in data){
        if(key === "id" || key === "titlu")
            continue;

        if(key === "titlu_colectie" && search_subcollection)
            continue;

        let par = document.createElement("p");
        par.title = key.charAt(0).toUpperCase() + key.slice(1);
        par.innerHTML = getIcon(key) + data[key];
        details.appendChild(par);
    }

    collections_el.appendChild(collection);

    setTimeout(e => {
        collection.classList.add("show");
    }, 100);
}

function generateSubcollection(data){
    let list = subcollection_el.querySelector(".list"),
        collection = document.createElement("div"),
        details = document.createElement("div"),
        image = document.createElement("img"),
        title = document.createElement("h1");

    collection.className = "collection";
    details.className = "details";
    image.src = "subcollection-images/" + data.id + ".jpg";
    title.innerHTML = data.titlu;

    collection.appendChild(image);
    collection.appendChild(details);
    details.appendChild(title);

    for(let key in data){
        if(key === "id" || key === "titlu" || key == "colectie")
            continue;

        let par = document.createElement("p");
        par.title = key.charAt(0).toUpperCase() + key.slice(1);
        par.innerHTML = getIcon(key) + data[key];
        details.appendChild(par);
    }

    list.appendChild(collection);

    setTimeout(e => {
        collection.classList.add("show");
    }, 100);
}

function displayCollections(){
    for(let i = current_display; i < current_display + PER_PAGE && i < collections_array.length; i++){
        if(i == collections_array.length - 1){
            more_button.style.display = "none";
        }

        generateCollection(collections_array[i]);
    }

    current_display += PER_PAGE;
}

async function searchComics(){
    let term = search_bar.value.trim().toLowerCase(),
        found = false,
        collections_shown = [],
        subcollections_shown = [];

    if(term.length < 3){
        collections_el.innerHTML = "";
        current_display = 0;
        displayCollections();
        more_button.style.display = "";
        return;
    }

    more_button.style.display = "none";
    collections_el.innerHTML = "";

    for(let i = 0; i < collections_array.length; i++){
        for(let key in collections_array[i]){
            if(  typeof collections_array[i][key] === "string"
              && collections_array[i][key].toLowerCase().indexOf(term) != -1
              && collections_shown.indexOf(collections_array[i].id) == -1
            ){
                if(!found){
                    found = true;
                }

                collections_shown.push(collections_array[i].id);
                generateCollection(collections_array[i]);
                await sleep(1);
            }
        }
    }

    for(let i = 0; i < subcollections_array.length; i++){
        let subclone = structuredClone(subcollections_array[i]),
            subparent = findCollection(subclone.colectie),
            subid = subclone.id + subclone.colectie;
    
        if(subparent !== -1){
            for(let key in subparent){
                if(key == "colectie" || key == "id" )
                    continue;

                if(key == "titlu"){
                    subclone.titlu_colectie = subparent.titlu;
                    continue;
                }

                subclone[key] = subparent[key];
            }
        }

        for(let key in subclone){
            if(  typeof subclone[key] === "string"
              && subclone[key].toLowerCase().indexOf(term) != -1
              && subcollections_shown.indexOf(subid) == -1
            ){
                if(!found){
                    found = true;
                }

                subcollections_shown.push(subid);
                generateCollection(subclone, 1);
                await sleep(1);
            }
        }
    }

    if(!found){
        collections_el.innerHTML = "<h1 class='no-results'>No results found.</h1>";
    }
}

let search_timeout = null;

function searchInput(){
    clearTimeout(search_timeout);

    search_timeout = setTimeout(searchComics, 500);
}

function handleCollectionOpen(e){
    let target = e.target;

    while(target !== e.currentTarget){
        if(  target.tagName === "DIV" 
          && target.classList.contains("collection") 
          && target.getAttribute("data-collection-id")
        ){
            openCollection(target.getAttribute("data-collection-id"));
            break;
        }

        target = target.parentNode;
    }
}

function openCollection(id){
    console.log(id);
    
    let found_collection = findCollection(id),
        found_subcollections = findSubcollections(id),
        details = subcollection_el.querySelector(".details");

    if(found_collection === -1)
        return;

    collections_el.style.display = "none";
    search_el.style.display = "none";
    subcollection_el.style.display = "";

    previous_more_button_state = more_button.style.display;
    more_button.style.display = "none";

    subcollection_el.querySelector(".list").innerHTML = "";
    subcollection_el.querySelector(".image").src = "collection-images/" + id + ".jpg";
    details.innerHTML = "<h1>" + found_collection.titlu + "</h1>";

    for(let key in found_collection){
        if(key === "id" || key === "titlu")
            continue;

        let par = document.createElement("p");
        par.title = key.charAt(0).toUpperCase() + key.slice(1);
        par.innerHTML = getIcon(key) + found_collection[key];
        details.appendChild(par);
    }

    console.log(id, found_subcollections);

    for(let i = 0; i < found_subcollections.length; i++){
        generateSubcollection(found_subcollections[i]);
    }
}

function findCollection(id){
    for(let i = 0; i < collections_array.length; i++){
        if(collections_array[i].id == id){
            return collections_array[i];
        }
    }

    return -1;
}

function findSubcollections(id){
    let array = [];

    for(let i = 0; i < subcollections_array.length; i++){
        console.log(subcollections_array[i].colectie, id)
        if(subcollections_array[i].colectie == id){
            array.push(subcollections_array[i]);
        }
    }

    return array;
}

function closeCollection(){
    collections_el.style.display = "";
    search_el.style.display = "";
    subcollection_el.style.display = "none";
    more_button.style.display = previous_more_button_state;
}

function load(){
    getComics();
    search_bar.addEventListener("keydown", searchInput);
    more_button.addEventListener("click", displayCollections);
    document.body.addEventListener("click", handleCollectionOpen);
    return_button.addEventListener("click", closeCollection);
}

window.addEventListener("load", load);