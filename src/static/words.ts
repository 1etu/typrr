import { practiceWords } from './practiceWords';

export const words = {
    common: [
        "the", "be", "to", "of", "and", "that", "have", "with",
        "this", "from", "they", "what", "make", "when", "time",
        "about", "there", "think", "which", "people", "year",
        "first", "world", "life", "where", "after", "back",
        "work", "most", "only", "then", "find", "also", "use",
        "give", "day", "want", "because", "any", "these", "need",
        "look", "good", "new", "come", "over", "other", "well",
        "even", "last", "long", "great", "little", "own", "same",
        "another", "right", "place", "while", "help", "talk", "turn",
        "start", "show", "part", "against", "three", "small", "end",
        "put", "home", "read", "hand", "big", "high", "every", "next",
        "few", "old", "leave", "mean", "keep", "let", "begin", "seem",
        "country", "talk", "where", "problem", "try", "ask", "work",
        "play", "run", "move", "live", "believe", "hold", "bring",
        "happen", "write", "provide", "sit", "stand", "lose", "pay",
        "meet", "include", "continue", "set", "learn", "change", "lead",
        "understand", "watch", "follow", "stop", "create", "speak",
        "read", "spend", "grow", "open", "walk", "win", "offer", "remember",
        "love", "consider", "appear", "buy", "wait", "serve", "die",
        "send", "expect", "build", "stay", "fall", "cut", "reach",
        "kill", "remain", "suggest", "raise", "pass", "sell", "require",
        "report", "decide", "pull", "return", "explain", "hope", "develop",
        "carry", "break", "receive", "agree", "support", "hit", "produce",
        "eat", "cover", "catch", "draw", "choose", "cause", "point",
        "listen", "realize", "place", "close", "involve", "increase",
        "represent", "apply", "manage", "design", "prepare", "discover",
        "ensure", "act", "affect", "establish", "imagine", "teach",
        "improve", "maintain", "protect", "occur", "identify", "determine",
        "recognize", "indicate", "assume", "enter", "tend", "exist",
        "suggest", "require", "achieve", "avoid", "reflect", "admit",
        "suffer", "express", "reveal", "contain", "control", "approach",
        "reflect", "admit", "suffer", "express", "reveal", "contain",
        "control", "approach", "reflect", "admit", "suffer", "express",
        "reveal", "contain", "control", "approach", "reflect", "admit",
        "suffer", "express", "reveal", "contain", "control", "approach"
    ],

    tech: [
        "code", "data", "file", "byte", "disk", "port", "link",
        "cloud", "debug", "array", "cache", "class", "input",
        "logic", "query", "stack", "pixel", "virus", "macro",
        "server", "syntax", "system", "output", "memory", "kernel",
        "algorithm", "binary", "compiler", "database", "encryption",
        "firewall", "gateway", "hardware", "internet", "javascript",
        "keyboard", "laptop", "malware", "network", "operating",
        "protocol", "quantum", "router", "software", "terminal",
        "upload", "virtual", "website", "xml", "yaml", "zip",
        "analytics", "backup", "bandwidth", "bitrate", "bluetooth",
        "botnet", "browser", "buffer", "bugfix", "bytecode", "captcha",
        "checksum", "cipher", "cloudflare", "codec", "command",
        "compression", "cookie", "cybersecurity", "daemon", "debugger",
        "decryption", "defragment", "digital", "domain", "download",
        "emulator", "ethernet", "firmware", "flashdrive", "framework",
        "frontend", "gigabyte", "hashing", "hostname", "hyperlink",
        "infosec", "interface", "ipaddress", "iteration", "joystick",
        "keystroke", "latency", "loadbalancer", "login", "mainframe",
        "malicious", "megabyte", "metadata", "middleware", "modem",
        "multithread", "nanosecond", "namespace", "neuralnetwork",
        "nodejs", "objectoriented", "opensource", "packet", "password",
        "patch", "phishing", "pixelated", "plugin", "pointer", "portscan",
        "protocol", "python", "querylanguage", "queue", "randomaccess",
        "reboot", "recovery", "recyclebin", "refactor", "registry",
        "resolution", "rootkit", "runtime", "sandbox", "screenshot",
        "script", "scrollbar", "searchengine", "serverless", "session",
        "shell", "silicon", "snapshot", "sourcecode", "spamfilter",
        "spyware", "subnet", "superuser", "syntaxerror", "systemcall",
        "telemetry", "terabyte", "token", "trojan", "turingtest",
        "uninstall", "update", "upload", "uptime", "usability",
        "username", "utility", "versioncontrol", "virtualmachine",
        "virus", "vulnerability", "webapp", "webserver", "whitelist",
        "widget", "wireless", "worm", "xml", "yaml", "zero-day"
    ],

    advanced: [
        "algorithm", "bandwidth", "compiler", "database", "encryption",
        "framework", "interface", "javascript", "middleware", "protocol",
        "repository", "typescript", "validation", "middleware", "deployment",
        "abstraction", "asynchronous", "authentication", "authorization",
        "backpropagation", "blockchain", "cryptocurrency", "decentralization",
        "differentiation", "disambiguation", "disintermediation", "encapsulation",
        "heterogeneous", "homogeneous", "hyperparameter", "implementation",
        "infrastructure", "interoperability", "localization", "machinelearning",
        "microservices", "neuralnetworks", "objectivity", "optimization",
        "parameterization", "personalization", "quantification", "reconciliation",
        "reengineering", "reproducibility", "scalability", "serialization",
        "synchronization", "transformation", "virtualization", "vulnerability",
        "webdevelopment", "webframework", "webscraping", "workflow",
        "xenophobia", "xylophone", "yesteryear", "youthfulness", "zealousness",
        "zoological", "zooplankton", "zucchini", "zygomatic", "zymurgy"
    ]
} as const;


export function getRandomWords(
    count: number = 5,
    categories: Array<keyof typeof words> = ['common', 'tech', 'advanced'],
    language: string = 'EN'
): string {
    if (language === 'TR') {
        const wordPool = practiceWords.LANG_TR;
        return getRandomWordsFromPool(wordPool, count);
    } else if (language === 'RU') {
        const wordPool = practiceWords.LANG_RU;
        return getRandomWordsFromPool(wordPool, count);
    }

    const wordPool = categories.flatMap(category => words[category]);
    return getRandomWordsFromPool(wordPool, count);
}

function getRandomWordsFromPool(wordPool: readonly string[], count: number): string {
    const selectedWords: string[] = [];
    while (selectedWords.length < count) {
        const randomIndex = Math.floor(Math.random() * wordPool.length);
        const word = wordPool[randomIndex];
        if (!selectedWords.includes(word)) {
            selectedWords.push(word);
        }
    }
    return selectedWords.join(' ');
} 