let sourceFile;
let languageFiles = [];
let convertedBlob = null;

const MC_ASSETS_REPO = "InventivetalentDev/minecraft-assets";
const DEFAULT_MC_ASSETS_VERSION = "26.2";

const versionSelect = document.getElementById("versionSelect");

const sourceInput = document.getElementById("sourceInput");
const languagesInput = document.getElementById("languagesInput");

const sourceButton = document.getElementById("sourceButton");
const languagesButton = document.getElementById("languagesButton");
const allLanguagesButton = document.getElementById("allLanguagesButton");

const sourceFileName = document.getElementById("sourceFileName");
const languagesFileName = document.getElementById("languagesFileName");

const sourceUploadUI = document.getElementById("sourceUploadUI");
const languagesUploadUI = document.getElementById("languagesUploadUI");

const convertAgainBtn = document.getElementById("convertAgainBtn");

// ---------------- UPLOAD ----------------

sourceButton.addEventListener("click", () => {
    sourceInput.click();
});

languagesButton.addEventListener("click", () => {
    languagesInput.click();
});

allLanguagesButton.addEventListener("click", () => {
    fetchAllLanguages();
});

sourceInput.addEventListener("change", () => {
    sourceFile = sourceInput.files[0];
    if (sourceFile) {
        sourceFileName.textContent = sourceFile.name;
        sourceUploadUI.classList.add("hidden");
        checkReady();
    }

});

languagesInput.addEventListener("change", () => {
    const files = [...languagesInput.files];
    if (files.length) {
        languageFiles = files.map(file => ({
            name: file.name,
            getText: () => file.text()
        }));
        languagesFileName.textContent =
            `${languageFiles.length} language(s) selected`;
        languagesUploadUI.classList.add("hidden");
        checkReady();
    }

});

// ---------------- VERSION LIST ----------------

async function loadVersionList() {
    try {
        const res = await fetch(
            `https://api.github.com/repos/${MC_ASSETS_REPO}/tags?per_page=100`
        );
        if (!res.ok) return;
        const tags = await res.json();
        if (!Array.isArray(tags) || !tags.length) return;

        versionSelect.innerHTML = "";
        for (const tag of tags) {
            const option = document.createElement("option");
            option.value = tag.name;
            option.textContent = tag.name;
            versionSelect.appendChild(option);
        }

        const hasDefault = [...versionSelect.options]
            .some(option => option.value === DEFAULT_MC_ASSETS_VERSION);
        if (hasDefault) {
            versionSelect.value = DEFAULT_MC_ASSETS_VERSION;
        }
    } catch (error) {
        console.error("Unable to load version list", error);
    }
}

loadVersionList();

// ---------------- FETCH ALL LANGUAGES ----------------

async function fetchAllLanguages() {
    languagesButton.disabled = true;
    allLanguagesButton.disabled = true;
    versionSelect.disabled = true;
    languagesFileName.textContent = "Loading languages...";
    try {
        const version = versionSelect.value || DEFAULT_MC_ASSETS_VERSION;
        const listUrl =
            `https://api.github.com/repos/${MC_ASSETS_REPO}/contents/assets/minecraft/lang?ref=${version}`;
        const listResponse = await fetch(listUrl);
        if (!listResponse.ok) {
            throw new Error(
                "Unable to retrieve the list of languages (HTTP "
                + listResponse.status + ")"
            );
        }
        const entries = await listResponse.json();
        const jsonEntries = entries.filter(
            entry => entry.type === "file" && entry.name.endsWith(".json")
        );

        if (!jsonEntries.length) {
            throw new Error("No language file found.");
        }

        languageFiles = jsonEntries.map(entry => ({
            name: entry.name,
            getText: async () => {
                const res = await fetch(entry.download_url);
                if (!res.ok) {
                    throw new Error(
                        "Failed to download " + entry.name
                    );
                }
                return res.text();
            }
        }));

        languagesFileName.textContent =
            `${languageFiles.length} language(s) loaded (mcasset.cloud ${version})`;
        languagesUploadUI.classList.add("hidden");
        checkReady();
    } catch (error) {
        console.error(error);
        alert(
            "Error occurred while fetching languages : " + error.message
        );
        languagesFileName.textContent = "";
    } finally {
        languagesButton.disabled = false;
        allLanguagesButton.disabled = false;
        versionSelect.disabled = false;
    }
}

// ---------------- CHECK ----------------

function checkReady() {
    if (sourceFile && languageFiles.length) {
        convertFiles();
    }
}

// ---------------- CONVERT ----------------

async function convertFiles() {
    languagesFileName.textContent = "Converting...";
    try {
        const sourceText = await sourceFile.text();
        const sourceJSON = JSON.parse(sourceText);
        const zip = new JSZip();
        for (const langFile of languageFiles) {
            const langText = await langFile.getText();
            const langJSON = JSON.parse(langText);
            const result = {};
            for (const key in sourceJSON) {
                if (
                    typeof sourceJSON[key] === "string" &&
                    typeof langJSON[key] === "string"
                ) {
                    result[key] = preserveFormatting(
                        sourceJSON[key],
                        langJSON[key]
                    );
                } else {
                    result[key] = sourceJSON[key];
                }
            }
            const outputName =
                langFile.name.replace(/\.json$/i, "")
                + ".json";
            zip.file(
                outputName,
                stringifyMinecraftJSON(result)
            );
        }
        convertedBlob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE"
        });
        languagesFileName.textContent =
            `${languageFiles.length} language(s) converted`;
        createDownloadButton();
    } catch (error) {
        console.error(error);
        alert(
            "Invalid JSON file detected."
        );
        languagesFileName.textContent = "";
    }
}

// ---------------- FORMAT PRESERVATION ----------------

function preserveFormatting(source, translated) {
    const placeholderRegex = /%\?/g;
    return source.replace(
        placeholderRegex,
        () => translated
    );

}

// ---------------- JSON FORMAT ----------------

function stringifyMinecraftJSON(obj) {
    let json = JSON.stringify(
        obj,
        null,
        4
    );
    json = json.replace(
        /[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
        pair => {
            const high =
                pair.charCodeAt(0)
                    .toString(16)
                    .padStart(4, "0")
                    .toUpperCase();
            const low =
                pair.charCodeAt(1)
                    .toString(16)
                    .padStart(4, "0")
                    .toUpperCase();
            return "\\u" + high +
                "\\u" + low;
        }
    );
    return json;
}

// ---------------- DOWNLOAD ----------------

function createDownloadButton() {
    let btn =
        document.getElementById("downloadBtn");
    if (!btn) {
        btn = document.createElement("button");
        btn.id = "downloadBtn";
        btn.className =
            "button button--blue";
        btn.textContent =
            "Download";
        document
            .querySelector("#rightActions")
            .appendChild(btn);
    }
    btn.onclick = () => {
        const url =
            URL.createObjectURL(convertedBlob);
        const a =
            document.createElement("a");
        a.href = url;
        a.download =
            "converted_languages.zip";
        a.click();
        URL.revokeObjectURL(url);
    };
    convertAgainBtn.classList.remove(
        "hidden"
    );
}

// ---------------- RESET ----------------

convertAgainBtn.addEventListener(
    "click",
    () => {
        sourceFile = null;
        languageFiles = [];
        convertedBlob = null;
        sourceInput.value = "";
        languagesInput.value = "";
        sourceFileName.textContent = "";
        languagesFileName.textContent = "";
        sourceUploadUI.classList.remove(
            "hidden"
        );
        languagesUploadUI.classList.remove(
            "hidden"
        );
        convertAgainBtn.classList.add(
            "hidden"
        );
        const btn =
            document.getElementById(
                "downloadBtn"
            );
        if (btn) {

            btn.remove();
        }
    });