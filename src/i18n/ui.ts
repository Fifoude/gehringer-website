export const languages = {
    fr: 'Français',
    en: 'English',
};

export const defaultLang = 'fr';

export const ui = {
    fr: {
        'nav.home': 'Accueil',
        'nav.interventions': 'Interventions',
        'nav.approach': 'Approche',
        'nav.contact': 'Contact',
        'nav.legal': 'Mentions légales',
        'site.logoSuffix': 'Conseil',
        'footer.certified': 'Manager de transition certifié <strong>Bilan Carbone®</strong>',
        'footer.eco': 'Ce site est éco-conçu et hébergé sur une infrastructure à faible empreinte carbone.',
        'chat.placeholder': 'Demander, chercher ou créer...',
        'chat.welcome': 'Bonjour ! Comment puis-je vous aider ?',
    },
    en: {
        'nav.home': 'Home',
        'nav.interventions': 'Interventions',
        'nav.approach': 'Approach',
        'nav.contact': 'Contact',
        'nav.legal': 'Legal Notice',
        'site.logoSuffix': 'Consulting',
        'footer.certified': '<strong>Carbon Footprint®</strong> Certified Transition Manager',
        'footer.eco': 'This site is eco-designed and hosted on low-carbon infrastructure.',
        'chat.placeholder': 'Ask, search or create...',
        'chat.welcome': 'Hello! How can I help you?',
    },
} as const;
