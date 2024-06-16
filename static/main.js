import { GoogleGenerativeAI } from "@google/generative-ai";
const conv = new showdown.Converter();
let currentAudio = null;

const fetchGoogleApiKey = async () => {
    const response = await fetch('/get-google-api-key');
    const data = await response.json();
    return data.google_api_key;
};

const initializeChat = async () => {
    const googleApiKey = await fetchGoogleApiKey();
    const genAI = new GoogleGenerativeAI(googleApiKey);
    const gen_model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const chat = gen_model.startChat({ generationConfig: { maxOutputTokens: 1000 } });

    let isUserResponse = false;

    const frameworks = {
        rational: "The rational decision-making model involves weighing all possible alternatives and selecting the one with the highest utility.",
        bounded: "The bounded rationality model acknowledges that decisions are often made with limited information and seeks 'good enough' solutions.",
        intuitive: "Intuitive decision-making relies on gut feelings and personal experiences, ideal for quick decisions.",
        decisionTree: "A decision tree helps visualize and evaluate choices, outcomes, and probabilities in a structured manner.",
        pugh: "The Pugh matrix evaluates and compares multiple alternatives based on set criteria, systematically quantifying and ranking options."
    };

    const askFrameworkQuestion = (framework) => {
        switch (framework) {
            case 'rational':
                return "Let's use the Rational Decision-Making Model. What are the possible alternatives you're considering?";
            case 'bounded':
                return "Using the Bounded Rationality Model, what is the most important information you have right now?";
            case 'intuitive':
                return "With Intuitive Decision-Making, what does your gut tell you about the options?";
            case 'decisionTree':
                return "Let's create a Decision Tree. What are the criteria and possible outcomes you need to consider?";
            case 'pugh':
                return "Using the Pugh Matrix, what criteria are most important to you in this decision?";
            default:
                return "Which decision-making framework would you like to use? Options are Rational, Bounded Rationality, Intuitive, Decision Tree, and Pugh Matrix.";
        }
    };

    const chatGemini = async (message, direction = "end") => {
        addMessage(message, direction);
        if (direction === "end") {
            try {
                let res = await chat.sendMessage(message);
                res = await res.response;
                console.log(`Gemini API raw response:`, res); // Debug log

                // Ensure res.text is a string
                const responseText = typeof res.text === 'function' ? res.text() : res.text;
                console.log(`Gemini API response text: ${responseText}`); // Debug log

                if (typeof responseText === 'string') {
                    let html = conv.makeHtml(responseText);
                    addMessage(html, "start");
                    // Convert text to speech
                    textToSpeech(responseText);
                } else {
                    throw new Error('Invalid response format from Gemini API');
                }

                isUserResponse = false;
            } catch (error) {
                displayError(error.message);
                console.error(`Error sending message to Gemini API:`, error); // Debug log
            }
        }
    };

    const addMessage = (msg, direction) => {
        const messageHolder = document.getElementById("messageHolder");
        const message = document.createElement("div");
        const colour = direction !== "start" ? "bg-blue-500" : "bg-purple-500";
        message.innerHTML = `<div class="flex flex-col items-${direction}"><div class="${colour} px-4 py-2 rounded-md text-white w-fit max-w-4xl mb-1">${msg}</div></div>`;
        messageHolder.appendChild(message);
        messageHolder.scrollTop = messageHolder.scrollHeight;
    };

    const displayError = (error) => {
        const errorContainer = document.getElementById("error-container");
        errorContainer.querySelector("span").innerText = error;
        errorContainer.classList.remove("hidden");
    };

    const textToSpeech = async (text) => {
        try {
            const speed = document.getElementById("speed-range").value;
            const response = await fetch('/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, speed })
            });
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.playbackRate = parseFloat(speed);
            audio.play();
            currentAudio = audio;
        } catch (error) {
            displayError(error.message);
            console.error(`Error converting text to speech:`, error); // Debug log
        }
    };

    const messageInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");
    const frameworkSelect = document.getElementById("framework-select");
    const chatUsername = document.getElementById("chat-username");
    const userNameDisplay = document.getElementById("user-name-display");
    const userAvatar = document.getElementById("user-avatar");
    const chatAvatar = document.getElementById("chat-avatar");

    document.getElementById("chatForm").addEventListener("submit", function (event) {
        event.preventDefault();
        const message = messageInput.value;
        messageInput.value = "";
        if (message.trim()) {
            isUserResponse = true;
            chatGemini(message, "end");
        }
    });

    const decisionFrameworkHandler = async (framework) => {
        const question = askFrameworkQuestion(framework);
        chatGemini(question, "start");
    };

    frameworkSelect.addEventListener("change", function () {
        const selectedFramework = this.value;
        decisionFrameworkHandler(selectedFramework);
    });

    // Audio Recording
    let mediaRecorder;
    let audioChunks = [];

    const startRecordBtn = document.getElementById("start-record-btn");
    const stopRecordBtn = document.getElementById("stop-record-btn");

    startRecordBtn.addEventListener("click", async () => {
        audioChunks = [];
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            try {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('file', audioBlob, 'recording.wav');

                const response = await fetch('/transcribe', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                if (result.text) {
                    chatGemini(result.text, "end");
                    console.log(`Transcribed text: ${result.text}`); // Debug log
                } else {
                    displayError(result.error);
                    console.error(`Transcription error: ${result.error}`); // Debug log
                }
            } catch (error) {
                displayError(error.message);
                console.error(`Error during transcription:`, error); // Debug log
            }
        };

        stopRecordBtn.disabled = false;
        startRecordBtn.disabled = true;
    });

    stopRecordBtn.addEventListener("click", () => {
        mediaRecorder.stop();
        stopRecordBtn.disabled = true;
        startRecordBtn.disabled = false;
    });

    // Speed Adjustment
    const speedRange = document.getElementById("speed-range");
    const speedValue = document.getElementById("speed-value");

    speedRange.addEventListener("input", () => {
        speedValue.textContent = `${speedRange.value}x`;
        if (currentAudio) {
            currentAudio.playbackRate = parseFloat(speedRange.value);
        }
    });

    // Stop Talking Button
    const stopTalkingBtn = document.getElementById("stop-talking-btn");
    stopTalkingBtn.addEventListener("click", () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
    });
};

initializeChat();
