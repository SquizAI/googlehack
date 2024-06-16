document.addEventListener('DOMContentLoaded', function() {
    const conversationTypeSelect = document.getElementById('conversation-type-select');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chat-input');
    const messageHolder = document.getElementById('messageHolder');
    const startRecordBtn = document.getElementById('start-record-btn');
    const stopRecordBtn = document.getElementById('stop-record-btn');
    const stopTalkingBtn = document.getElementById('stop-talking-btn');
    const speedRange = document.getElementById('speed-range');
    const speedValue = document.getElementById('speed-value');
    const recordingIndicator = document.getElementById('recording-indicator');
    const loadingIndicator = document.getElementById('loading-indicator');
    const frameworkSelect = document.getElementById('framework-select');

    let recognition;
    let isRecording = false;
    let currentAudio = null;
    let selectedFramework = '';
    let selectedConversationType = '';

    conversationTypeSelect.addEventListener('change', function() {
        selectedConversationType = this.value;
        handleConversationTypeChange(selectedConversationType);
    });

    frameworkSelect.addEventListener('change', function() {
        selectedFramework = this.value;
        const promptMessage = askFrameworkQuestion(selectedFramework);
        addMessage(promptMessage, 'system', 'text');
    });

    const handleConversationTypeChange = (type) => {
        switch (type) {
            case 'regular':
                addMessage("You selected Regular Chat. How can I assist you today?", 'system', 'text');
                break;
            case 'investor':
                addMessage("You selected Investor Conversation. What topic or industry would you like to research?", 'system', 'text');
                break;
            case 'educator':
                addMessage("You selected Educator Syllabus Builder. What is the subject or topic of the lesson?", 'system', 'text');
                break;
            default:
                addMessage("Please select a valid conversation type.", 'system', 'text');
        }
    };

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

    chatForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const message = chatInput.value;
        if (message.trim() === '') return;
        addMessage(message, 'user', 'text');
        chatInput.value = '';
        showLoadingIndicator();

        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message, conversationType: selectedConversationType, framework: selectedFramework })
        });
        const result = await response.json();
        hideLoadingIndicator();
        if (result.response) {
            addMessage(result.response, 'ai', 'text');
            textToSpeech(result.response);
        }
    });

    const addMessage = (message, sender, type) => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        messageElement.innerHTML = `<div class="flex flex-col ${sender === 'user' ? 'items-end' : 'items-start'}"><div class="${sender === 'user' ? 'bg-blue-500' : 'bg-gray-700'} px-4 py-2 rounded-md text-white w-fit max-w-2xl mb-1">${message}</div></div>`;
        messageHolder.appendChild(messageElement);
        messageHolder.scrollTop = messageHolder.scrollHeight;
    };

    startRecordBtn.addEventListener('click', function() {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = function() {
            isRecording = true;
            startRecordBtn.classList.add('hidden');
            stopRecordBtn.classList.remove('hidden');
            recordingIndicator.classList.remove('hidden');
        };

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            addMessage(transcript, 'user', 'text');
            showLoadingIndicator();
            fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: transcript, conversationType: selectedConversationType, framework: selectedFramework })
            }).then(response => response.json())
              .then(result => {
                  hideLoadingIndicator();
                  if (result.response) {
                      addMessage(result.response, 'ai', 'text');
                      textToSpeech(result.response);
                  }
              });
        };

        recognition.onerror = function(event) {
            addMessage(`Error in speech recognition: ${event.error}`, 'system', 'text');
        };

        recognition.onend = function() {
            isRecording = false;
            startRecordBtn.classList.remove('hidden');
            stopRecordBtn.classList.add('hidden');
            recordingIndicator.classList.add('hidden');
        };

        recognition.start();
    });

    stopRecordBtn.addEventListener('click', function() {
        if (recognition && isRecording) {
            recognition.stop();
        }
    });

    const textToSpeech = async (text) => {
        try {
            const speed = speedRange.value;
            const response = await fetch('/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, speed })
            });
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.playbackRate = parseFloat(speed);
            audio.play();
            currentAudio = audio;

            stopTalkingBtn.classList.remove('hidden');
            audio.onended = () => {
                stopTalkingBtn.classList.add('hidden');
            };
        } catch (error) {
            addMessage(`Error in text-to-speech: ${error.message}`, 'system', 'text');
        }
    };

    speedRange.addEventListener('input', function() {
        speedValue.innerText = `${speedRange.value}x`;
        if (currentAudio) {
            currentAudio.playbackRate = parseFloat(speedRange.value);
        }
    });

    stopTalkingBtn.addEventListener('click', function() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            stopTalkingBtn.classList.add('hidden');
        }
    });

    const showLoadingIndicator = () => {
        loadingIndicator.classList.remove('hidden');
    };

    const hideLoadingIndicator = () => {
        loadingIndicator.classList.add('hidden');
    };
});
