// update preferences across site
window.addEventListener('DOMContentLoaded', () => {
    const dyslexia = localStorage.getItem('dyslexiaMode') == 'true';
    if (dyslexia) setFont(true);

    const colorblind = localStorage.getItem('colorblindMode') == 'true';
    if (colorblind) setColors(true);
});


// DYSLEXIA FONTS
function setFont(enable) {
    let newFont = false;
    if (enable) { // grab the font to change to
        newFont = getComputedStyle(document.documentElement).getPropertyValue('--dyslexiaFriendlyFont');
    }
    else {
        newFont = getComputedStyle(document.documentElement).getPropertyValue('--generalFont');
    }
    document.body.style.fontFamily = newFont; // set the new font
    localStorage.setItem('dyslexiaMode', enable); // save to user's local storage
}
// enable/disable buttons
const enableDyslexia = document.getElementById('fontToggleEnable');
const disableDyslexia = document.getElementById('fontToggleDisable');
enableDyslexia.addEventListener('click', () => setFont(true));
disableDyslexia.addEventListener('click', () => setFont(false));


// COLOR MODES
function setColors(enable) {
    if (enable) {
        document.documentElement.style.setProperty('--brown', '#7F5539'); 
        document.documentElement.style.setProperty('--lightBrown', '#d6bb94ff'); 
        document.documentElement.style.setProperty('--darkBrown', '#53351e'); 
        document.documentElement.style.setProperty('--offWhite', '#f3f1efff'); 
        document.documentElement.style.setProperty('--green', '#82aa00ff'); 
        document.documentElement.style.setProperty('--darkGreen', '#3E5D00');
    } else { 
        document.documentElement.style.setProperty('--brown', '#7F5539'); 
        document.documentElement.style.setProperty('--lightBrown', '#A68A64'); 
        document.documentElement.style.setProperty('--darkBrown', '#53351e'); 
        document.documentElement.style.setProperty('--offWhite', '#EDE0D4'); 
        document.documentElement.style.setProperty('--green', '#656D4A'); 
        document.documentElement.style.setProperty('--darkGreen', '#414833'); 
    }
    localStorage.setItem('colorblindMode', enable); // save preference
}
// enable/disable buttons
const enableColorBlind = document.getElementById('colorBlindToggleEnable');
const disableColorBlind = document.getElementById('colorBlindToggleDisable');
enableColorBlind.addEventListener('click', () => setColors(true));
disableColorBlind.addEventListener('click', () => setColors(false));