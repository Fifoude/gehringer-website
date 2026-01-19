export const chatTranslations = {
    fr: {
        title: 'Assistant Gehringer',
        welcome: {
            intro: 'Je peux vous aider à :',
            task1: 'analyser un document',
            task2: 'préparer un échange ciblé avec Philippe',
            task3: 'clarifier un besoin ou une problématique managériale...',
        },
        actions: {
            analyze_doc: 'Analyser une offre ou une fiche de poste',
            analyze_doc_prompt: 'Pourriez-vous analyser le document suivant ?',
            evaluate_fit: 'Évaluer l’adéquation entre un besoin et l’expérience de Philippe',
            evaluate_fit_prompt: 'Évaluer l’adéquation entre le besoin suivant et l’expérience de Philippe : ',
        },
        privacy: 'IA Locale & confidentielle : Cette IA fonctionne localement afin de limiter l\'exposition des données. Elle assiste la réflexion sans se substituer à la décision humaine.',
        input: {
            placeholder: 'Demander, chercher ou créer...',
            disclaimer: 'L\'IA peut faire des erreurs. Vérifiez les informations importantes.',
            sending: 'Envoi...',
            thinking: 'Thinking...', // Garder thinking ou mettre "Réflexion..." ? "Thinking..." est souvent accepté. Disons "Réflexion..." pour le FR.
            thinking_fr: 'Réflexion en cours...',
        },
        auth: {
            required_title: 'Connexion requise',
            required_desc: 'Veuillez entrer votre email pour continuer.',
            placeholder_email: 'votre@email.com',
            get_code: 'Recevoir le code',
            cancel: 'Annuler',
            verify_title: 'Vérification',
            verify_desc: 'Entrez le code reçu par email.',
            verify_btn: 'Vérifier',
            change_email: 'Changer d\'email',
            logout: 'Déconnexion',
            success: 'Authentification réussie !',
            sent: 'Code envoyé par email !',
            error_init: 'Erreur lors de l\'initialisation.',
            error_verify: 'Code incorrect ou erreur serveur.',
            session_expired: 'Session expirée. Veuillez vous reconnecter.',
        },
        errors: {
            mic_access: 'Impossible d\'accéder au microphone.',
            send_error: 'Erreur lors de l\'envoi du message.',
            generic: 'Désolé, une erreur est survenue.',
            login_required: 'Veuillez vous identifier pour envoyer un message.',
        },
        labels: {
            voice_msg: 'Message vocal',
            audio_received: 'Message audio reçu',
        },
        tooltip: "Bonjour, c'est l'A.I. de Gehringer"
    },
    en: {
        title: 'Gehringer Assistant',
        welcome: {
            intro: 'I can help you to:',
            task1: 'analyze a document',
            task2: 'prepare a targeted meeting with Philippe',
            task3: 'clarify a managerial need or issue...',
        },
        actions: {
            analyze_doc: 'Analyze a job offer or job description',
            analyze_doc_prompt: 'Could you analyze the following document?',
            evaluate_fit: 'Evaluate the fit between a need and Philippe\'s experience',
            evaluate_fit_prompt: 'Evaluate the fit between the following need and Philippe\'s experience: ',
        },
        privacy: 'Local & Confidential AI: This AI runs locally to limit data exposure. It supports reflection without replacing human decision-making.',
        input: {
            placeholder: 'Ask, search or create...',
            disclaimer: 'AI can make mistakes. Check important info.',
            sending: 'Sending...',
            thinking: 'Thinking...',
            thinking_fr: 'Thinking...',
        },
        auth: {
            required_title: 'Login Required',
            required_desc: 'Please enter your email to continue.',
            placeholder_email: 'your@email.com',
            get_code: 'Get Code',
            cancel: 'Cancel',
            verify_title: 'Verification',
            verify_desc: 'Enter the code received by email.',
            verify_btn: 'Verify',
            change_email: 'Change email',
            logout: 'Logout',
            success: 'Authentication successful!',
            sent: 'Code sent by email!',
            error_init: 'Error during initialization.',
            error_verify: 'Incorrect code or server error.',
            session_expired: 'Session expired. Please log in again.',
        },
        errors: {
            mic_access: 'Unable to access microphone.',
            send_error: 'Error sending message.',
            generic: 'Sorry, an error occurred.',
            login_required: 'Please log in to send a message.',
        },
        labels: {
            voice_msg: 'Voice message',
            audio_received: 'Audio message received',
        },
        tooltip: "Hello, I'm Gehringer's AI"
    }
};
