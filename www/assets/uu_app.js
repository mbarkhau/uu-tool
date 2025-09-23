var uu_app = (function () {

const { PDFDocument, StandardFonts, rgb } = PDFLib;

// Global variables for loaded data
let CONFIGS = {};
let configDataLoaded = false;

// Cache for loaded data
const dataCache = new Map();

// Optimized data loading with caching
async function loadJSONData(url, cacheKey) {
    if (dataCache.has(cacheKey)) {
        return dataCache.get(cacheKey);
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        dataCache.set(cacheKey, data);
        return data;
    } catch (error) {
        console.error(`Failed to load ${url}:`, error);
        throw error;
    }
}

async function loadConfigData() {
    try {
        const configData = await loadJSONData('assets/config.json', 'config');
        CONFIGS = configData.CONFIGS || {};
    } catch (error) {
        console.error('Failed to load config data:', error);
        CONFIGS = {};
    }
}

const configOptionNodes = document.querySelectorAll(".config-option");

var selectedConfigId = localStorage.getItem("uu-tool.selected-config");

function updateConfig(configId) {
    selectedConfigId = configId
    localStorage.setItem('uu-tool.selected-config', selectedConfigId)

    configOptionNodes.forEach(elem => elem.classList.remove('selected'))
    document.querySelector("#" + selectedConfigId).classList.add('selected')

    const cfg = CONFIGS[selectedConfigId]
    const htmlText = `
    <p>Damit die <b>${cfg.name}</b> zur ${cfg.election} antreten kann, müssen ${cfg.minimum_support} bescheinigte Unterschriften bis zum <b>${cfg.deadline}</b> gesammelt werden.</p>

    <p>Mehr Infos zur Wahl und zu den Kandidaten der Partei finden Sie auf <a target="_blank" rel="noopener noreferrer nofollow" href="${cfg.partyHref}">${cfg.partyHrefText}</a>, sowie auf <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.bundeswahlleiter.de/europawahlen/2024/informationen-wahlbewerber.html">bundeswahlleiter.de&ZeroWidthSpace;/europawahlen/2024/</a>.</p>
    `
    document.querySelector('.config-texts').innerHTML = htmlText;
}

function configClickHandler(id) {
    return function() {updateConfig(id)}
}

configOptionNodes.forEach(function(opt) {
    if (CONFIGS[opt.id] == null) {
        console.warn("Invalid config (maybe typo)", opt.id);
    }
    opt.addEventListener('click', configClickHandler(opt.id))
    return null;
});

function levenshtein(s1, s2) {
    // CC BY-SA 3.0 - https://stackoverflow.com/q/18516942/62997
    s1 = s1.toLowerCase()
    s2 = s2.toLowerCase()

    if (s1 === s2) {return 0;}

    var s1_len = s1.length, s2_len = s2.length;
    if (s1_len == 0 || s2_len == 0) {
        return s1_len + s2_len;
    }

    var i1 = 0, i2 = 0, a, b, c, c2, row = [];
    while (i1 < s1_len) {
        row[i1] = ++i1;
    }

    while (i2 < s2_len) {
        c2 = s2.charCodeAt(i2);
        a = i2;
        ++i2;
        b = i2;
        for (i1 = 0; i1 < s1_len; ++i1) {
            c = a + (s1.charCodeAt(i1) === c2 ? 0 : 1);
            a = row[i1];
            b = b < a ? (b < c ? b + 1 : c) : (a < c ? a + 1 : c);
            row[i1] = b;
        }
    }
    return b;
};


function formField(name) {
    var field = document.getElementsByName(name)[0];
    if (!field) {
        field = document.getElementById(name);
    }
    return field;
}

function cityText(city) {
return `
Bürgerbüro ${city['name']}<br>
${city['str']},<br>
${city['plz']}, ${city['ort']}
`.trim()
}

var adminSelect = null;

async function populateAdminAddress(value) {
    if (!value) {return}

    const valueParts = value.split(", ")
    const plz = valueParts[0]
    const ort = valueParts[1]
    const citiesUrl = "city_data/buero_" + plz.slice(0, 1) + ".json"

    const citiesBuffer = await fetch(citiesUrl).then(res => res.arrayBuffer());
    const citiesBytes = new TextDecoder().decode(citiesBuffer);
    const citiesData = JSON.parse(citiesBytes)

    const matchingCities = []

    function fuzzyEqualsString(a, b) {
        a = a.replaceAll(' ', '').toLowerCase()
        b = b.replaceAll(' ', '').toLowerCase()
        return a.includes(b)
    }

    // Try to get an exact match, and fall back on looser matches
    // if none can be found.
    for (var i = citiesData.length - 1; i >= 0; i--) {
        const curCity = citiesData[i];
        if (curCity['plz'].substring(0, 3) != plz.substring(0, 3)) {
            continue
        }
        if (curCity['plz'] == plz && levenshtein(curCity['ort'], ort) < 2) {
            matchingCities.push(curCity)
        } else if (curCity['name'] && levenshtein(curCity['name'], ort) < 3) {
            matchingCities.push(curCity)
        } else if (levenshtein(curCity['ort'], ort) < 3) {
            matchingCities.push(curCity)
        } else if (curCity['plz'] == plz) {
            matchingCities.push(curCity)
        }
    }

    matchingCities.sort((a, b) => {
        var aIsMatch = a['plz'] == plz && a['name'] && levenshtein(a['name'], ort) < 2
        if (aIsMatch) { return -1; }
        var bIsMatch = b['plz'] == plz && a['name'] && levenshtein(b['name'], ort) < 2
        if (bIsMatch) { return 1; }

        aIsMatch = a['plz'] == plz && levenshtein(a['ort'], ort) < 2
        if (aIsMatch) { return -1; }
        bIsMatch = b['plz'] == plz && levenshtein(b['ort'], ort) < 2
        if (bIsMatch) { return 1; }

        aIsMatch = levenshtein(a['name'], ort) < 2
        if (aIsMatch) { return -1; }
        bIsMatch = levenshtein(b['name'], ort) < 2
        if (bIsMatch) { return 1; }
        
        aIsMatch = levenshtein(a['ort'], ort) < 2
        if (aIsMatch) { return -1; }
        bIsMatch = levenshtein(b['ort'], ort) < 2
        if (bIsMatch) { return 1; }
        
        aIsMatch = levenshtein(a['plz'], ort) < 2
        if (aIsMatch) { return -1; }
        bIsMatch = levenshtein(b['plz'], ort) < 2
        if (bIsMatch) { return 1; }
        
        return b['population'] - a['population']
    });

    function setSelectedAdminAddress(buero) {
        // console.log([buero])
        const adminAddrNode = document.querySelector('.buero-address')
        if (buero == null || buero == "<br>") {
            adminAddrNode.innerHTML = "<div><span>Gemeinde: Unbekannt</span></div>";
            return
        }
        adminAddrNode.innerHTML = `
            <div><span>Gemeinde: </span>
                <span id='city-name'>${buero['name']}</span></div>
            <div><span>Straße: </span>
                <span id='city-street'>${buero['str']}</span></div>
            <div><span>Ort: </span>
                <span id='city-plz'>${buero['plz']}, ${buero['ort']}</span></div>
            <div><span>Phone: </span>
                <span id='city-phone'>${buero['phone'] || "-"}</span></div>
            <div><span>Email: </span>
                <span id='city-email'>${buero['email'] || "-"}</span></div>
        `

        const title = encodeURIComponent(`Datenfehler für ${plz}, ${ort}`);
        const body = encodeURIComponent([
            `Für die PLZ: "${plz}" und Ort/Stadt: "${ort}" wurde die falsche Behörde aufgelöst.`,
            "",
            "Folgende Korrekturen sind nötig:",
            "",
            "<Korrekte Daten der zuständigen Behörde hier Ergänzen>",
            "",
            "Die Daten zur aufgelösten Stadt:",
            "",
            "```json",
            JSON.stringify(buero, null, 4),
            "```",
        ].join("\n"));

        const githubIssueRefNode = document.querySelector("a[href^='https://github.com/']")
        const githubIssueURL = new URL(githubIssueRefNode.href)

        githubIssueURL.search = ["?title=", title, "&body=", body].join("");
        githubIssueRefNode.href = githubIssueURL.href

        const teleRefNode = document.querySelector("a[href^='https://www.google.com/search']")
        const teleQuery = encodeURIComponent(`Telefonnummer Bürgeramt ${buero['ort'] || buero['name']} ${buero['str']} ${buero['PLZ']}, ${buero['ort']}`)
        teleRefNode.href = "https://www.google.com/search?q=" + teleQuery
    }

    if (matchingCities.length == 0) {
        document.querySelector('.buero-address').innerHTML = "-"
        return
    }

    var bueroOptions = [
        {'value': "<br>", 'text': "bitte wählen", 'city': "<br>"}
    ]

    for (var i = 0; i < matchingCities.length; i++) {
        var city = matchingCities[i];
        bueroOptions.push({
            'value': cityText(city),
            'text' : cityText(city),
            'city' : city,
        });
    }

    if (bueroSelect != null) {
        bueroSelect.destroy();
        bueroSelect = null;
    }

    const addressSelectNode = document.querySelector('#buero-address-select')

    if (matchingCities.length == 0) {
        addressSelectNode.innerHTML = "-";
    } else if (matchingCities.length == 1) {
        addressSelectNode.innerHTML = '';
        setSelectedAdminAddress(matchingCities[0]);
    } else {
        addressSelectNode.innerHTML = '';
        bueroSelect = new TomSelect("#buero-address-select", {
            options: bueroOptions,
            allowEmptyOption: true,
            maxOptions: 20,
            maxItems: 1,
            create: false,
            render: {
                option: function(opt) {return '<div>' + opt.text + '</div>';},
                item  : function(opt) {return '<div>' + opt.text + '</div>';},
            }
        });

        bueroSelect.on('change', function(text) {
            setSelectedAdminAddress(null)
            bueroSelect.blur();
            for (var i = adminOptions.length - 1; i >= 0; i--) {
                if (cityText(adminOptions[i].city) == text) {
                    setSelectedAdminAddress(adminOptions[i].city);
                }
            }
        });

        bueroSelect.setValue(adminOptions[0].value);
        setSelectedAdminAddress(adminOptions[0].city);
    }
}

function validateForm() {
    formField('download').disabled = true;

    const lastnameField = formField('lastname');
    if (lastnameField.value.length == 0) {
        return lastnameField.classList.add('warn');
    } else {
        lastnameField.classList.remove('warn');
    }

    const firstnameField = formField('firstname');
    if (firstnameField.value.length == 0) {
        return firstnameField.classList.add('warn');
    } else {
        firstnameField.classList.remove('warn');
    }

    const birthdayField = formField('birthday');
    if (birthdayField.value.length == 0 && birthdayField.value.length != 10) {
        return birthdayField.classList.add('warn')
    } else {
        birthdayField.classList.remove('warn')
    }

    const streetField = formField('street');
    if (streetField.value.length == 0) {
        return streetField.classList.add('warn');
    } else {
        streetField.classList.remove('warn');
    }

    const plzField = formField('postleitzahl');
    if (plzField.value.length == 0 && plzField.value.length == 6) {
        return plzField.classList.add('warn');
    } else {
        plzField.classList.remove('warn');
    }
    formField('download').disabled = false;
}

var plzSelect = null;

async function initForm() {
    try {
        // Load config and PLZ data in parallel
        const [configPromise, plzPromise] = await Promise.allSettled([
            loadConfigData(),
            loadPLZData()
        ]);
        
        if (configPromise.status === 'rejected') {
            console.error('Config loading failed:', configPromise.reason);
        }
        
        if (plzPromise.status === 'rejected') {
            console.error('PLZ data loading failed:', plzPromise.reason);
            return;
        }
        
        // Initialize config selection
        if (selectedConfigId == null) {
            updateConfig('pdv-eu-2024')
        } else {
            updateConfig(selectedConfigId)
        }

        const fieldNames = [
            'lastname',
            'firstname',
            'birthday',
            'street',
            'postleitzahl',
        ];

        for (var i = fieldNames.length - 1; i >= 0; i--) {
            formField(fieldNames[i]).addEventListener('change', validateForm);
        }

        const plzData = plzPromise.value;

    const plzOptions = (function() {
        var options = []
        for (const [plz, placeNames] of Object.entries(plzData)) {
            for (var i = 0; i < placeNames.length; i++) {
                const entry = plz + ", " + placeNames[i];
                options.push({'text': entry, 'value': entry})
            }
        }
        return options;
    })();

    plzSelect = new TomSelect('select[name=postleitzahl]', {
        options: plzOptions,
        allowEmptyOption: true,
        maxOptions: 50,
        maxItems: 1,
        create: false,
    });
    plzSelect.on('change', function(value) {
        plzSelect.blur();
        setTimeout(() => populateAdminAddress(value));
    });
    plzSelect.on('dropdown_open', function() {
        plzSelect.clear()
    });
    
    } catch (error) {
        console.error('Form initialization failed:', error);
        throw error;
    }
}

// Optimized PLZ data loading
async function loadPLZData() {
    try {
        return await loadJSONData('plz_data/postleitzahlen_2023_v3.json', 'plz');
    } catch (error) {
        console.error('Failed to load PLZ data:', error);
        throw error;
    }
}

async function initApp() {
    try {
        await initForm();
    } catch (error) {
        console.error('App initialization failed:', error);
    }
}

window.addEventListener('load', initApp);

async function downloadPDF() {
  const pdfDoc = await PDFDocument.create();

  const sansRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  // const serifRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

  function drawText(page, posX, posY, font, text) {
    page.drawText(text, {
        x    : posX,
        y    : posY,
        size : 10,
        font : font,
        color: rgb(0, 0, 0),
    })
  }

  const config = CONFIGS[selectedConfigId];

  async function loadPDF(url) {
    var isHTTP = location.protocol == 'http:';
    const pdfBytes = await fetch(url).then(res => res.arrayBuffer())
    return await PDFDocument.load(pdfBytes, {ignoreEncryption: isHTTP})
  }

  const pdfDoc1 = await loadPDF(config['pdf_form'])
  const pdfDoc2 = await loadPDF(config['pdf_cover_letter'])

  const [page1, page2] = await pdfDoc.copyPages(pdfDoc1, [0, 1])
  const [page3] = await pdfDoc.copyPages(pdfDoc2, [0])

  // Update pdf content from form

  for (var i = 0; i < config['sender_addr'].length; i++) {
    var line = config['sender_addr'][i];
    drawText(page3, 340, 735 - i * 15, (i ? sansRegular : sansBold), line)
  }

  for (var i = 0; i < config['return_addr'].length; i++) {
    var line = config['return_addr'][i];
    drawText(page3, 235, 330 - i * 13, (i ? sansRegular : sansBold), line)
  }

  for (var i = 0; i < config['sender_sign'].length; i++) {
      var line = config['sender_sign'][i];
      drawText(page3, 71, 110 - i * 14, sansRegular, line)
  }

  const lastnameField  = formField('lastname');
  const firstnameField = formField('firstname');
  const birthdayField  = formField('birthday');
  const streetField    = formField('street');
  const plzField       = formField('postleitzahl');

  const birthdayValue = birthdayField.value.split("-").reverse().join(".")

  drawText(page1, 66, 520, serifBold, lastnameField.value)
  drawText(page1, 66, 497, serifBold, firstnameField.value)
  drawText(page1, 366, 497, serifBold, birthdayValue)
  drawText(page1, 66, 460, serifBold, streetField.value)
  drawText(page1, 66, 435, serifBold, plzField.value)

  try {
      const cityNameField = formField('city-name');
      drawText(page3, 71, 690, sansBold, cityNameField.innerText)
      drawText(page3, 71, 674, sansBold, "Gemeindeverwaltung/Bürgeramt")
  } catch (err) {console.log(err)}

  try {
      const cityStreetField = formField('city-street');
      drawText(page3, 71, 658, sansRegular, cityStreetField.innerText)
  } catch (err) {console.log(err)}

  try {
      const cityPlzField    = formField('city-plz');
      drawText(page3, 71, 642, sansRegular, cityPlzField.innerText)
  } catch (err) {console.log(err)}

  pdfDoc.addPage(page1)
  pdfDoc.addPage(page2)
  pdfDoc.addPage(page3)

  const pdfBytes = await pdfDoc.save()

  // Trigger the browser to download the PDF document
  download(pdfBytes, config['download_name'], "application/pdf");

  return false;
}

const player = document.getElementById("js-player");

player && player.addEventListener('click', function() {
  if (document.querySelector('iframe') !== null) {
    return;
  }

  var apiScript = document.createElement('script');
  apiScript.src = 'https://www.youtube.com/player_api';
  document.body.appendChild(apiScript);

  (function initPlayer() {
    if (window.YT && window.YT.Player) {
        new YT.Player(document.querySelector("#js-player"), {
            videoId: 'BFSABttHAgs',
            host: 'https://www.youtube-nocookie.com',
            playerVars: {autoplay: 1},
        });
    } else {
        setTimeout(initPlayer, 10);
    }
  })();
});

// function dummySelect(plzOrt) {
//     plzSelect.setValue(plzOrt)
//     populateAdminAddress(plzOrt)
// }

// setTimeout(function(){ dummySelect("63150, Heusenstamm"); }, 1000)
// setTimeout(function(){ dummySelect("01561, Lauterbach"); }, 3000)

return {
    downloadPDF: downloadPDF
}
})();
