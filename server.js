const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Base de données temporaire en mémoire pour simuler la base à long terme de claude-mem
// (Suffisant pour démarrer vos tests sur le plan gratuit !)
const memoryDatabase = {};

// ==========================================
// ROUTE ANTI-SOMMEIL (Pour UptimeRobot)
// ==========================================
app.get('/health', (req, res) => {
    res.status(200).json({ status: "allumé", timestamp: new Date() });
});

// ==========================================
// 1. LOGIQUE RÉELLE : HEADROOM (Compression de code)
// ==========================================
function executeHeadroom(code) {
    if (!code) return "";
    return code
        // 1. Supprime les commentaires de bloc /* ... */
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // 2. Supprime les commentaires de ligne // ...
        .replace(/(^|[^\\])\/\/.*\$/gm, '\$1')
        // 3. Supprime les lignes vides et les espaces inutiles en début/fin de ligne
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
        // 4. Remplace les espaces multiples par un seul espace
        .replace(/[ \t]+/g, ' ');
}

// ==========================================
// 2. LOGIQUE RÉELLE : CLAUDE-MEM (Gestion de la mémoire)
// ==========================================
function executeClaudeMem(userId, currentPrompt) {
    if (!userId) userId = "default_user";
    
    // Récupère l'historique ou crée un tableau vide
    if (!memoryDatabase[userId]) {
        memoryDatabase[userId] = [];
    }
    
    // Extrait le contexte passé pour l'injecter au modèle
    const pastContext = memoryDatabase[userId].join(" | ");
    
    // Sauvegarde la requête actuelle dans la mémoire pour la prochaine fois (limité aux 5 derniers faits importants)
    if (currentPrompt.length > 10) {
        memoryDatabase[userId].push(currentPrompt);
        if (memoryDatabase[userId].length > 5) memoryDatabase[userId].shift();
    }
    
    return pastContext;
}

// ==========================================
// 3. LOGIQUE RÉELLE : TASK OBSERVER (Ajustement du style de réponse)
// ==========================================
function executeTaskObserver(userStylePreference) {
    // Si l'utilisateur a défini des préférences de style (ex: "soit concis", "inclus des commentaires")
    // On force l'I.A. à adopter ce comportement exact.
    if (!userStylePreference) return "Adopte un style de développeur senior, propre et documenté.";
    return `Respecte strictement ces préférences de style apprises de l'utilisateur : ${userStylePreference}`;
}

// ==========================================
// 4. PASSERELLE PRINCIPALE POUR CHATGPT (Endpoint unique)
// ==========================================
app.post('/api/v1/execute', async (req, res) => {
    try {
        const { userId, prompt, codeInput, userStyle } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Le champ 'prompt' est requis." });
        }

        // Exécution des modules les uns après les autres
        const compressedCode = executeHeadroom(codeInput || "");
        const memories = executeClaudeMem(userId, prompt);
        const styleInstructions = executeTaskObserver(userStyle);

        // Préparation de la réponse finale structurée que ChatGPT va analyser
        // Étape OmniRoute : On structure la requête pour que ChatGPT ou un routeur d'API tiers la traite
        const finalInstructionsPourChatGPT = `
        [CONTEXTE DE MÉMOIRE (claude-mem)] : ${memories || "Aucun historique disponible."}
        [STYLE APPRIS (Task Observer)] : ${styleInstructions}
        [CODE OPTIMISÉ (Headroom)] : 
        ${compressedCode || "Aucun code fourni."}
        `;

        // Calcul des gains de tokens pour le rapport
        const originalLength = (codeInput || "").length;
        const compressedLength = compressedCode.length;
        const economy = originalLength > 0 ? Math.round(((originalLength - compressedLength) / originalLength) * 100) : 0;

        // On renvoie le résultat propre
        res.status(200).json({
            success: true,
            instructions: finalInstructionsPourChatGPT,
            userPrompt: prompt,
            report: {
                tokensSavedPercent: `${economy}%`,
                status: "Optimisé par votre Marketplace"
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de l'exécution des plugins." });
    }
});

// Lancement de l'application
app.listen(PORT, () => {
    console.log(`Félicitations ! Votre Marketplace centralisée tourne sur le port ${PORT}`);
});
