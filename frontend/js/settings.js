import { supabase } from "./session.js";

let currentUser = null;

//load user and their settings
async function initializeSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;

    if (currentUser) {
        //load settings from database
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('dark_mode, colorblind_mode, dyslexia_font')
            .eq('user_id', currentUser.id)
            .single();

        if (!error && profile) {
            //sync db settings to local storage
            localStorage.setItem('dyslexiaMode', profile.dyslexia_font);
            localStorage.setItem('colorblindMode', profile.colorblind_mode);
            localStorage.setItem('darkMode', profile.dark_mode);

            if (profile.dyslexia_font) setFont(true, false);
            if (profile.colorblind_mode) setColors(true, false);
            //TODO: if (profile.dark_mode) setDarkMode(true, false);
        }
    } else {
        //user not logged in, load from local storage only
        const dyslexia = localStorage.getItem('dyslexiaMode') === 'true';
        if (dyslexia) setFont(true, false);

        const colorblind = localStorage.getItem('colorblindMode') === 'true';
        if (colorblind) setColors(true, false);

        //TODO: const darkMode = localStorage.getItem('darkMode') === 'true';
        //if (darkMode) setDarkMode(true, false);
    }
}

initializeSettings();

// update preferences across site
window.addEventListener('DOMContentLoaded', () => {
    const dyslexia = localStorage.getItem('dyslexiaMode') == 'true';
    if (dyslexia) setFont(true);

    const colorblind = localStorage.getItem('colorblindMode') == 'true';
    if (colorblind) setColors(true);
});


// DYSLEXIA FONTS
async function setFont(enable, saveToDb = true) {
    let newFont = false;
    if (enable) {  //grab the font to change to
        newFont = getComputedStyle(document.documentElement).getPropertyValue('--dyslexiaFriendlyFont');
    } else {
        newFont = getComputedStyle(document.documentElement).getPropertyValue('--generalFont');
    }
    document.body.style.fontFamily = newFont;  //set new font
    localStorage.setItem('dyslexiaMode', enable);  //save to user's local storage

    //save to db if user is logged in and saveToDb is true
    if (saveToDb && currentUser) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ dyslexia_font: enable })
                .eq('user_id', currentUser.id);
            
            if (error) {
                console.error('Error saving dyslexia font setting:', error);
            }
        } catch (err) {
            console.error('Error updating database:', err);
        }
    }
}

// enable/disable buttons
const enableDyslexia = document.getElementById('fontToggleEnable');
const disableDyslexia = document.getElementById('fontToggleDisable');
enableDyslexia.addEventListener('click', () => setFont(true));
disableDyslexia.addEventListener('click', () => setFont(false));

// COLOR MODES
async function setColors(enable, saveToDb = true) {
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
    localStorage.setItem('colorblindMode', enable);  //save preference

    //save to db if user is logged in and saveToDb is true
    if (saveToDb && currentUser) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ colorblind_mode: enable })
                .eq('user_id', currentUser.id);
            
            if (error) {
                console.error('Error saving colorblind mode setting:', error);
            }
        } catch (err) {
            console.error('Error updating database:', err);
        }
    }
}

// enable/disable buttons
const enableColorBlind = document.getElementById('colorBlindToggleEnable');
const disableColorBlind = document.getElementById('colorBlindToggleDisable');
enableColorBlind.addEventListener('click', () => setColors(true));
disableColorBlind.addEventListener('click', () => setColors(false));

// USERNAME CHANGE
const usernameForm = document.getElementById('usernameForm');
const newUsernameInput = document.getElementById('newUsername');
const usernameStatus = document.getElementById('usernameStatus');

if (usernameForm) {
    usernameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            usernameStatus.textContent = 'You must be logged in to change your username.';
            usernameStatus.style.color = 'red';
            return;
        }

        const newUsername = newUsernameInput.value.trim();
        
        if (!newUsername) {
            usernameStatus.textContent = 'Please enter a username.';
            usernameStatus.style.color = 'red';
            return;
        }

        //Basic validation
        if (newUsername.length < 3) {
            usernameStatus.textContent = 'Username must be at least 3 characters.';
            usernameStatus.style.color = 'red';
            return;
        }

        if (newUsername.length > 30) {
            usernameStatus.textContent = 'Username must be less than 30 characters.';
            usernameStatus.style.color = 'red';
            return;
        }

        try {
            usernameStatus.textContent = 'Updating username...';
            usernameStatus.style.color = 'gray';

            const { error } = await supabase
                .from('profiles')
                .update({ username: newUsername })
                .eq('user_id', currentUser.id);

            if (error) {
                if (error.code === '23505') {  //unique constraint violation
                    usernameStatus.textContent = 'Username already taken. Please choose another.';
                    usernameStatus.style.color = 'red';
                } else {
                    usernameStatus.textContent = 'Error updating username. Please try again.';
                    usernameStatus.style.color = 'red';
                    console.error('Error updating username:', error);
                }
            } else {
                usernameStatus.textContent = 'Username successfully updated!';
                usernameStatus.style.color = 'green';
                newUsernameInput.value = '';
                
                //clear success message after 3 seconds
                setTimeout(() => {
                    usernameStatus.textContent = '';
                }, 3000);
            }
        } catch (err) {
            usernameStatus.textContent = 'An unexpected error occurred.';
            usernameStatus.style.color = 'red';
            console.error('Error:', err);
        }
    });
}