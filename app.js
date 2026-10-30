import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from
    "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    serverTimestamp
} from
    "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


// --------------------------------------------------
// 1. APPLICATION STATE
// --------------------------------------------------

let selectedRole = "student";
let isRegistering = false;
let profileCreationInProgress = false;
let currentUser = null;
let currentRole = null;
let displayedNotes = [];

const CACHE_KEY = "ruralLearnOfflineNotes";


// --------------------------------------------------
// 2. GET HTML ELEMENTS
// --------------------------------------------------

const welcomePage = document.getElementById("welcomePage");
const loginPage = document.getElementById("loginPage");
const studentDashboard =
    document.getElementById("studentDashboard");
const teacherDashboard =
    document.getElementById("teacherDashboard");
const contentPage = document.getElementById("contentPage");

const loginForm = document.getElementById("loginForm");
const loginTitle = document.getElementById("loginTitle");
const loginDescription =
    document.getElementById("loginDescription");

const loginMessage = document.getElementById("loginMessage");
const submitButton = document.getElementById("submitButton");
const showRegisterButton =
    document.getElementById("showRegisterButton");

const contentTitle = document.getElementById("contentTitle");
const contentBody = document.getElementById("contentBody");


// --------------------------------------------------
// 3. PAGE NAVIGATION
// --------------------------------------------------

function showOnly(page) {
    [
        welcomePage,
        loginPage,
        studentDashboard,
        teacherDashboard,
        contentPage
    ].forEach(section => section.classList.add("hidden"));

    page.classList.remove("hidden");
}

function showHome() {
    showOnly(welcomePage);
}

function showDashboard() {
    if (currentRole === "teacher") {
        showOnly(teacherDashboard);
    } else {
        showOnly(studentDashboard);
    }
}

function showLogin(role) {
    selectedRole = role;
    isRegistering = false;

    loginForm.reset();
    loginMessage.textContent = "";

    loginTitle.textContent =
        role === "teacher" ? "Teacher Login" : "Student Login";

    loginDescription.textContent =
        "Enter your registered email and password.";

    submitButton.textContent = "Sign In";

    showRegisterButton.classList.toggle(
        "hidden",
        role !== "student"
    );

    showOnly(loginPage);
}


// --------------------------------------------------
// 4. WELCOME BUTTONS
// --------------------------------------------------

document
    .getElementById("studentLoginButton")
    .addEventListener("click", () => {
        showLogin("student");
    });

document
    .getElementById("teacherLoginButton")
    .addEventListener("click", () => {
        showLogin("teacher");
    });

document
    .getElementById("backButton")
    .addEventListener("click", showHome);

document
    .getElementById("homeLogo")
    .addEventListener("click", event => {
        event.preventDefault();

        if (currentUser) {
            showDashboard();
        } else {
            showHome();
        }
    });


// --------------------------------------------------
// 5. STUDENT REGISTRATION MODE
// --------------------------------------------------

showRegisterButton.addEventListener("click", () => {
    isRegistering = !isRegistering;

    loginMessage.textContent = "";

    if (isRegistering) {
        loginTitle.textContent = "Create Student Account";

        loginDescription.textContent =
            "Register with your email and a password.";

        submitButton.textContent = "Create Account";

        showRegisterButton.textContent =
            "Already registered? Sign in";
    } else {
        loginTitle.textContent = "Student Login";

        loginDescription.textContent =
            "Enter your registered email and password.";

        submitButton.textContent = "Sign In";

        showRegisterButton.textContent =
            "New student? Create an account";
    }
});


// --------------------------------------------------
// 6. FRIENDLY ERROR MESSAGES
// --------------------------------------------------

function getFriendlyError(error) {
    const messages = {
        "auth/email-already-in-use":
            "This email is already registered.",

        "auth/invalid-email":
            "Please enter a valid email address.",

        "auth/invalid-credential":
            "Incorrect email or password.",

        "auth/user-not-found":
            "No account was found. Check your details.",

        "auth/wrong-password":
            "Incorrect email or password.",

        "auth/weak-password":
            "Choose a stronger password.",

        "auth/too-many-requests":
            "Too many attempts. Please try again later.",

        "permission-denied":
            "You do not have permission to perform this action.",

        "unavailable":
            "The service is temporarily unavailable."
    };

    return messages[error.code] ||
        "Something went wrong. Please try again.";
}


// --------------------------------------------------
// 7. REGISTER OR SIGN IN
// --------------------------------------------------

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = document
        .getElementById("email")
        .value.trim();

    const password = document
        .getElementById("password")
        .value;

    submitButton.disabled = true;
    loginMessage.textContent = "Please wait...";

    try {
        if (isRegistering && selectedRole === "student") {
            profileCreationInProgress = true;

            const name = email.split("@")[0];

            const result =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            // Every self-registered account starts as a student.
            // The role cannot be chosen by the user.

            const { setDoc, doc } = await import(
                "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js"
            );

            await setDoc(
                doc(db, "users", result.user.uid),
                {
                    name: name,
                    email: email,
                    role: "student",
                    createdAt: serverTimestamp()
                }
            );

            profileCreationInProgress = false;

currentUser = result.user;
currentRole = "student";

document.getElementById("studentWelcome").textContent =
    `Welcome, ${name}!`;
    profileCreationInProgress = false;

showDashboard();

loginMessage.textContent =
    "Account created successfully.";
        } else {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        }

    } catch (error) {

        console.error(error);

        loginMessage.textContent =
            getFriendlyError(error);

    } finally {

        submitButton.disabled = false;

    }
});


// --------------------------------------------------
// 8. CHECK LOGIN AND USER ROLE
// --------------------------------------------------

onAuthStateChanged(auth, async user => {

    if (profileCreationInProgress) {
        return;
    }

    currentUser = user;
    currentRole = null;

    if (!user) {
        showHome();
        return;
    }

    try {

        const { getDoc, doc } = await import(
            "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js"
        );

        const profile = await getDoc(
            doc(db, "users", user.uid)
        );

        if (!profile.exists()) {

            await signOut(auth);

            showHome();

            alert(
                "Your account profile is missing. " +
                "Please contact the administrator."
            );

            return;
        }

        currentRole = profile.data().role;

        // Check that the requested portal matches
        // the role stored in the database.

        if (
            selectedRole === "teacher" &&
            currentRole !== "teacher"
        ) {

            await signOut(auth);

            loginMessage.textContent =
                "This account is not authorized as a teacher.";

            showLogin("teacher");

            return;
        }

        if (
            selectedRole === "student" &&
            currentRole !== "student"
        ) {

            await signOut(auth);

            loginMessage.textContent =
                "Please use the correct login portal.";

            showLogin("student");

            return;
        }

        const name = profile.data().name || user.email;

        document.getElementById("studentWelcome").textContent =
            `Welcome, ${name}!`;

        document.getElementById("teacherWelcome").textContent =
            `Welcome, ${name}!`;

        showDashboard();

    } catch (error) {

        console.error(error);

        showHome();

        alert(
            "Unable to verify your account. " +
            "Check your internet connection and try again."
        );

    }

});


// --------------------------------------------------
// 9. SIGN OUT
// --------------------------------------------------

document.addEventListener("click", async event => {

    const button = event.target.closest(
        'button[data-action="logout"]'
    );

    if (!button) {
        return;
    }

    try {

        await signOut(auth);

        currentUser = null;
        currentRole = null;

        showHome();

    } catch (error) {

        alert(getFriendlyError(error));

    }

});


// --------------------------------------------------
// 10. CONTENT PAGE
// --------------------------------------------------

function openContent(title) {

    contentTitle.textContent = title;

    contentBody.replaceChildren();

    showOnly(contentPage);

}

document
    .getElementById("contentBackButton")
    .addEventListener("click", showDashboard);


// --------------------------------------------------
// 11. SAFE HTML ELEMENT CREATION
// --------------------------------------------------

function createElement(tag, className, text) {

    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;

}


// --------------------------------------------------
// 12. OFFLINE NOTE CACHE
// --------------------------------------------------

function saveNotesToCache(notes) {

    try {

        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify(notes)
        );

    } catch (error) {

        console.warn("Unable to cache notes:", error);

    }

}

function readNotesFromCache() {

    try {

        const cached = localStorage.getItem(CACHE_KEY);

        return cached ? JSON.parse(cached) : [];

    } catch (error) {

        console.warn("Unable to read cached notes:", error);

        return [];

    }

}


// --------------------------------------------------
// 13. DISPLAY NOTES
// --------------------------------------------------

function renderNotes(notes, offline = false) {

    displayedNotes = notes;

    contentBody.replaceChildren();

    const badge = createElement(
        "span",
        "status-badge",
        offline ? "Offline saved notes" : "Library"
    );

    contentBody.appendChild(badge);

    if (notes.length === 0) {

        contentBody.appendChild(
            createElement(
                "p",
                "",
                offline
                    ? "No saved notes are available offline yet."
                    : "No notes have been published yet."
            )
        );

        return;

    }

    notes.forEach((note, index) => {

        const card = createElement("article", "resource-card");

        card.appendChild(
            createElement("h3", "", note.title)
        );

        card.appendChild(
            createElement("p", "", `Subject: ${note.subject}`)
        );

        const openButton = createElement(
            "button",
            "",
            "Read Notes"
        );

        openButton.addEventListener("click", () => {

            showNote(note);

        });

        card.appendChild(openButton);

        const downloadButton = createElement(
            "button",
            "secondary-button",
            "Download for Offline"
        );

        downloadButton.addEventListener("click", () => {

            downloadNote(note, index);

        });

        card.appendChild(downloadButton);

        contentBody.appendChild(card);

    });

}


// --------------------------------------------------
// 14. OPEN ONE NOTE
// --------------------------------------------------

function showNote(note) {

    openContent(note.title);

    const badge = createElement(
        "span",
        "status-badge",
        navigator.onLine ? "Learning material" : "Offline material"
    );

    contentBody.appendChild(badge);

    contentBody.appendChild(
        createElement("h3", "", note.subject)
    );

    const text = createElement(
        "p",
        "resource-text",
        note.content
    );

    contentBody.appendChild(text);

    const downloadButton = createElement(
        "button",
        "",
        "Download as Text File"
    );

    downloadButton.addEventListener("click", () => {
        downloadNote(note);
    });

    contentBody.appendChild(downloadButton);

}


// --------------------------------------------------
// 15. DOWNLOAD NOTES
// --------------------------------------------------

function downloadNote(note, index = 0) {

    const content =
        `${note.title}\n` +
        `Subject: ${note.subject}\n\n` +
        `${note.content}`;

    const blob = new Blob(
        [content],
        { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
        `${note.title.replace(/[^a-z0-9]/gi, "_")}.txt`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // Save a copy in the browser for offline access.

    const cache = readNotesFromCache();

    const existingIndex = cache.findIndex(
        item => item.id === note.id
    );

    if (existingIndex >= 0) {
        cache[existingIndex] = note;
    } else {
        cache.push(note);
    }

    saveNotesToCache(cache);

    alert("The note was saved to your device.");

}


// --------------------------------------------------
// 16. LOAD NOTES FROM FIRESTORE
// --------------------------------------------------

async function loadNotes() {

    openContent("Class Notes");

    contentBody.appendChild(
        createElement("p", "", "Loading notes...")
    );

    try {

        if (!navigator.onLine) {
            throw new Error("offline");
        }

        const notesQuery = query(
            collection(db, "notes"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(notesQuery);

        const notes = snapshot.docs.map(document => ({
            id: document.id,
            ...document.data()
        }));

        saveNotesToCache(notes);

        renderNotes(notes);

    } catch (error) {

        console.warn("Using offline note cache:", error);

        renderNotes(readNotesFromCache(), true);

    }

}


// --------------------------------------------------
// 17. TEACHER NOTE MANAGEMENT
// --------------------------------------------------

function showTeacherNoteForm() {

    openContent("Manage Class Notes");

    const form = createElement("form", "resource-form");

    form.innerHTML = `
        <h3>Publish Learning Material</h3>

        <label for="noteTitle">Note Title</label>
        <input id="noteTitle"
               maxlength="150"
               required>

        <label for="noteSubject">Subject</label>
        <input id="noteSubject"
               maxlength="100"
               required>

        <label for="noteContent">Notes Content</label>
        <textarea id="noteContent"
                  maxlength="20000"
                  required></textarea>

        <button type="submit">Publish Notes</button>

        <p id="teacherNoteMessage"
           role="status"
           aria-live="polite"></p>
    `;

    contentBody.appendChild(form);

    form.addEventListener("submit", async event => {

        event.preventDefault();

        if (
            !currentUser ||
            currentRole !== "teacher"
        ) {

            alert("Teacher access is required.");

            return;

        }

        const title = form
            .querySelector("#noteTitle")
            .value.trim();

        const subject = form
            .querySelector("#noteSubject")
            .value.trim();

        const content = form
            .querySelector("#noteContent")
            .value.trim();

        const message = form.querySelector(
            "#teacherNoteMessage"
        );

        const publishButton = form.querySelector(
            'button[type="submit"]'
        );

        if (!title || !subject || !content) {

            message.textContent =
                "Please complete every field.";

            return;

        }

        publishButton.disabled = true;
        message.textContent = "Publishing notes...";

        try {

            await addDoc(collection(db, "notes"), {

                title,
                subject,
                content,

                createdBy: currentUser.uid,

                createdAt: serverTimestamp()

            });

            message.textContent =
                "Notes published successfully.";

            form.reset();

        } catch (error) {

            console.error(error);

            message.textContent =
                getFriendlyError(error);

        } finally {

            publishButton.disabled = false;

        }

    });

}


// --------------------------------------------------
// 18. ASSIGNMENT PLACEHOLDERS
// --------------------------------------------------

function showComingSoon(title) {

    openContent(title);

    contentBody.appendChild(
        createElement(
            "p",
            "",
            "This module will be implemented in the next development phase."
        )
    );

}


// --------------------------------------------------
// 19. DASHBOARD NAVIGATION
// --------------------------------------------------

document.addEventListener("click", event => {

    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    switch (button.dataset.action) {

        case "open-library":
            loadNotes();
            break;

        case "manage-notes":

            if (currentRole === "teacher") {
                showTeacherNoteForm();
            }

            break;

        case "open-assignments":
            showComingSoon("My Assignments");
            break;

        case "manage-assignments":
            showComingSoon("Manage Assignments");
            break;

        case "open-recordings":
            showComingSoon("Recorded Classes");
            break;

        case "open-progress":
            showComingSoon("My Progress");
            break;

        case "manage-progress":
            showComingSoon("Student Progress");
            break;

    }

});


// --------------------------------------------------
// 20. PROGRESSIVE WEB APP SERVICE WORKER
// --------------------------------------------------

if ("serviceWorker" in navigator) {

    window.addEventListener("load", async () => {

        try {

            await navigator.serviceWorker.register(
                "./service-worker.js"
            );

            console.log("Service worker registered.");

        } catch (error) {

            console.error(
                "Service worker registration failed:",
                error
            );

        }

    });

}