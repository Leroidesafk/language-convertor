let sourceFile;
let languageFiles = [];
let convertedBlob = null;


const sourceInput = document.getElementById("sourceInput");
const languagesInput = document.getElementById("languagesInput");

const sourceButton = document.getElementById("sourceButton");
const languagesButton = document.getElementById("languagesButton");

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

sourceInput.addEventListener("change", () => {
    sourceFile = sourceInput.files[0];
    if (sourceFile) {
        sourceFileName.textContent = sourceFile.name;
        sourceUploadUI.classList.add("hidden");
        checkReady();
    }

});

languagesInput.addEventListener("change", () => {
    languageFiles = [...languagesInput.files];
    if (languageFiles.length) {
        languagesFileName.textContent =
            `${languageFiles.length} language(s) selected`;
        languagesUploadUI.classList.add("hidden");
        checkReady();
    }

});

// ---------------- CHECK ----------------

function checkReady() {
    if (sourceFile && languageFiles.length) {
        convertFiles();
    }
}

// ---------------- CONVERT ----------------

async function convertFiles() {
    try {
        const sourceText = await sourceFile.text();
        const sourceJSON = JSON.parse(sourceText);
        const zip = new JSZip();
        for (const langFile of languageFiles) {
            const langText = await langFile.text();
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
        createDownloadButton();
    } catch (error) {
        console.error(error);
        alert(
            "Invalid JSON file detected."
        );
    }
}

// ---------------- FORMAT PRESERVATION ----------------

function preserveFormatting(source, translated) {
    const placeholderRegex = /%[0-9]*\$?[a-zA-Z]/g;
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
            .querySelector(".extra-buttons")
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