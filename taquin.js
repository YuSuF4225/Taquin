"use strict";

document.addEventListener("DOMContentLoaded", function() {

    const cbDarkmode = document.querySelector("input[name='cbDarkmode']")

    // initialisation darkmode + persistance
    if (localStorage.getItem("DARKMODE") === "true") {
        document.body.classList.add("dark");
        cbDarkmode.checked = true;
    }

    // extraction de la taille de la grille de l'URL (paramètre N=?)
    const N = document.URL.split("N=")[1];
    const SIZE = (N && N.match(/^[3-9]$/)) ? Number(N) : 4;
    document.querySelector("form input[name='numSize']").value = SIZE;
    document.body.style.setProperty("--nb",SIZE);
    
    // élément HTML représentant la grille
    const table = document.querySelector("table#grille");
        
    // objet créé pour le TP3 -- sera instancié à la fin de la vérification du paramétrage
    let grille = null;
    
    // gestion du score (laissée côté interface graphique) 
    const score = { time: 0, moves: 0 };


    /** Ecouteur clic de souris sur la table (délégation d'événement) */
    table.addEventListener("click", function(e) {
        if (e.target.tagName !== "DIV" || !grille || grille.isFinished()) return;
        swap(e.target);
    });

    /**
     * Demande l'échange avec la portion d'image cliquée. 
     * @param {HTMLDivElement} elt la portion d'image
     */
    function swap(div) {
        // détermine ligne et colonne sélectionnés (sans utiliser de champs data-XXX)
        const TD1 = div.parentElement;
        const l = TD1.parentElement.getPosition();  // fonction customizée, voir fin du sujet
        const c = TD1.getPosition();
        
        if (grille.swap(l,c)) {
            // répercute l'échange visuellement   --évite d'utiliser grille.render(table)
            const TD2 = document.querySelector("#grille .hidden").parentElement;
            TD1.appendChild(TD2.firstChild);
            TD2.appendChild(TD1.firstChild);
            // mise à jour du score si basé sur le nombre de coups
            const span = document.getElementById("score");
            if (score.type === "moves") {     
                span.innerHTML = score.moves;
            }
            // fin du jeu
            if (grille.isFinished()) {
                table.classList.add("completed");
                const pseudo = document.querySelector("input[name='pseudo']").value.trim();
                const msg = `Bravo ${pseudo}, vous avez résolu le taquin en `
                    + (score.type === "moves" ? `${span.innerHTML} coups` : span.innerHTML);
                setTimeout(`alert('${msg}')`, 1000);
            }
        }
    }

    /** Ecouteur appui sur une touche du clavier */
    document.addEventListener("keydown", function(e) {
        if (e.code === "KeyD" && document.querySelector("input:focus") !== document.querySelector("input[name='pseudo']")) {        // mode sombre
            toggleDarkMode();
            // ajout pour le TP2
            cbDarkmode.checked = document.body.classList.contains("dark");
            return;
        }
        if (grille && !grille.isFinished()) { 
            let l = grille.empty.l, c = grille.empty.c;
            switch (e.code) {
                case "ArrowDown":
                    l--;
                    break;
                case "ArrowUp":
                    l++;
                    break;
                case "ArrowLeft":
                    c++;
                    break;
                case "ArrowRight":
                    c--;
                    break;
            }
            const elt = document.querySelector(`#grille tr:nth-child(${l+1}) td:nth-child(${c+1})`);
            if (elt) {
                swap(elt); 
            }
        }
    });

    /** Ecouteur sur le bouton de redémarrage de la partie */
    document.getElementById("btnRestart").addEventListener("click", function() {
        if (table.classList.contains("completed") || confirm("Voulez-vous abandonner la partie en cours ?")) {
            document.location.reload();
        }
    });

    /** AJOUTS POUR LE TP2 */
    function toggleDarkMode() {
        document.body.classList.toggle("dark");
        localStorage.setItem("DARKMODE", document.body.classList.contains("dark"));
    }
    cbDarkmode.addEventListener("change", toggleDarkMode);

    document.querySelector("form").addEventListener("submit", function(e) {
        // Annulation du comportement par défaut de l'événement :        
        e.preventDefault();

        // vérification du pseudo 
        const pseudo = document.querySelector("input[name='pseudo']").value.trim();
        if (pseudo.length == 0) {
            alert("Le pseudo ne doit pas être vide.");
            return;
        }
        // vérification de la taille de la grille
        const numSize = Number(document.querySelector("input[name='numSize']").value);
        if (numSize < 3 || numSize > 8) {
            alert("La taille de grille sélectionnée n'est pas correcte.");
            return;
        }
        // vérification de l'image sélectionnée 
        const img = document.querySelector("select[name='selImage']").value;
        if (["image1.png","image2.jpg","image3.png"].indexOf(img) < 0) {
            alert("L'image choisie n'est pas correcte.");
            return;
        }
        // vérification système de score
        const type = document.querySelector("[name='radScore']:checked").value;
        if (type !== "time" && type !== "moves") {
            alert("Le système de score sélectionné n'est pas correct.");
            return;
        }
        // on fixe les paramètres pour le jeu
        table.style.setProperty("--image", `url('${img}')`);
        document.body.style.setProperty("--nb", numSize);
        score.type = type;
        // initialize le jeu
        grille = new Taquin(numSize);
        grille.render(table);
        // mise en place du système de score basé sur le temps (si sélectionné)
        if (type === "time") {
            document.querySelector("footer").firstChild.nodeValue = "Temps écoulé : ";
            document.getElementById("score").innerHTML = "0s";
            const start = Date.now();
            const i = setInterval(function() {  // une magnifique "closure"
                if (!table.classList.contains("completed")) {
                    score.time = Math.floor((Date.now() - start) / 1000);
                    document.getElementById("score").innerHTML = score.time + "s";
                }
                else {
                    clearInterval(i);
                }
            }, 1000);
        }
        // rend visible la zone de jeu
        this.classList.add("hidden"); 
    });


    /**
     * Description de la classe Taquin en charge de la gestion "propre" de la partie. 
     */
    class Taquin {

        /**
         * Construction du jeu de taquin. Le modèle de données comprend :
         * - la grille (tableau en deux dimensions de valeurs entières)
         * - la coordonnée de la case mobile (en bas à gauche dans la version résolue)
         * @param {number} SIZE taille de la grille (largeur ou hauteur)
         */
        constructor(SIZE) {
            this.size = SIZE;
            // création et mélange de la grille (tableau à deux dimensions directement)
            this.grid = [];
            for (let l=0; l < SIZE; l++) {
                this.grid[l] = [];
                for (let c=0; c < SIZE; c++) {
                    this.grid[l].push(l*SIZE + c);
                }
            }
            this.empty = { l: SIZE-1, c: SIZE-1 };
            let n = 0;
            // tableau représentant les déplacements dans les 4 directions orthogonales
            const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
            // boucle réalisant le mélange de la grille par échanges successifs
            do {
                // calcul des voisins
                const neighbors = dirs.filter(d => {
                    const newL = this.empty.l + d[0];
                    const newC = this.empty.c + d[1];
                    return this.grid[newL] && this.grid[newL][newC] !== undefined;
                }).map(d => [this.empty.l+d[0], this.empty.c+d[1]]);
                // on choisit un voisin au hasard
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                // on échange le contenu de la case mobile avec son voisin 
                this.swap(next[0], next[1]);
            }
            while (++n < SIZE * SIZE * SIZE);
            console.log(this.grid);
        }

        /**
         * Echange la case actuellement vide avec celle passée en paramètre.
         * @param {number} l la ligne de la case à échanger 
         * @param {number} c la colonne de la case à échanger
         * @returns true si l'échange a pu avoir lieu, false sinon.
         */
        swap(l, c) {
            const manhattanDist = Math.abs(this.empty.l - l) + Math.abs(this.empty.c - c);
            // si les deux cases ne sont pas côte-à-côte --> on termine
            if (manhattanDist !== 1) {
                return false;
            }
            // on échange les contenus des deux cases
            this.grid[this.empty.l][this.empty.c] = this.grid[l][c];
            this.grid[l][c] = this.size * this.size - 1;  // la case mobile est toujours la dernière du carré
            // on met à jour la position de la case mobile
            this.empty = { l, c };      // raccourci pour { l: l, c: c }
            return true;
        }

        /**
         * Vérifie si la grille est complétée. 
         * @returns true si la grille est complète, false sinon. 
         */
        isFinished() {
            for (let l=0; l < this.size; l++) {
                for (let c=0; c < this.size; c++) {
                    if (this.grid[l][c] != l * this.size + c) {
                        return false;
                    }
                }
            }
            return true;
        }

        /**
         * Dessine la grille dans l'élément HTMLTable passé en paramètre
         * @param {HTMLTableElement} table le tableau représentant la grille
         */
        render(table) {
            // précaution : vider la table (ne devrait pas être utile)
            table.innerHTML = "";
            for (let l=0; l < this.size; l++) {
                const tr = document.createElement("tr");
                for (let c=0; c < this.size; c++) {
                    const td = document.createElement("td");
                    tr.appendChild(td);
                    const div = document.createElement("div");
                    const c1 = this.grid[l][c] % this.size;
                    const l1 = Math.floor(this.grid[l][c] / this.size);
                    div.style.backgroundPositionX = `calc(${-c1} * var(--size))`;
                    div.style.backgroundPositionY = `calc(${-l1} * var(--size))`;
                    if (l == this.empty.l && c == this.empty.c) {
                        div.className = "hidden";
                    }
                    td.appendChild(div);
                }
                table.appendChild(tr);
            }
        }

    }


    /**
     * Surcharge du prototype des HTMLElement pour récupérer leur position.
     * Cette méthode information n'existe pas naturellement dans les objets HTMLElement. 
     * On utilise ici le mécanisme consistant à étendre le prototype de ce type d'objet
     * de façon à ce que la méthode soit désormais utilisable sur tous les éléments HTML.
     */
    HTMLElement.prototype.getPosition = function() {
        let e = this, i = 0;
        // compte le nombre de "previous sibling" 
        // (noeud frère précédent le noeud actuel dans l'arbre DOM)
        while (e.previousElementSibling) {
            e = e.previousElementSibling;
            i++;
        }
        return i;
    }

});
