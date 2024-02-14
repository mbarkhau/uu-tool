var uu_app = (function () {

const { PDFDocument, StandardFonts, rgb } = PDFLib;

const CONFIGS = {
    'pdv-eu-2024': {
        'name'            : "Partei der Vernunft",
        'election'        : "Europawahl 2024",
        'deadline'        : "29.02.2024",
        'partyHref'       : "https://parteidervernunft.de/europawahl-2024-unterstuetzen-sie-die-partei-der-vernunft/",
        'partyHrefText'   : "parteidervernunft.de&ZeroWidthSpace;/europawahl-2024/",
        'minimum_age'     : "16",
        'minimum_support' : "4000",
        'pdf_form'        : "pdf_data/EUWahl2024_PDV_UU_Formular_v2.pdf",
        'pdf_cover_letter': "pdf_data/Gemeindebuero_Anschreiben_PDV_v6.pdf",
        'download_name'   : "PDV_Unterstuetzungsunterschrift_EUWahl2024.pdf",
        'sender_phone'    : "+49 (0)152 5403 4785",         // pdv
        'sender_email'    : "info@parteidervernunft.de",
        // 'sender_addr'     : [
        //     "Partei der Vernunft",
        //     "Bundesgeschäftsstelle",
        //     "Postfach 10 15 24",
        //     "01691 Freital",
        // ],
        'sender_addr'     : [
            "Florian Handwerker",
            "Wallbergstr. 4",
            "83620 Feldkirchen-Westerham",
            "florian.handwerker@die-libertaeren.de",
        ],
        'return_addr'     : [
            "Florian Handwerker",
            "PDV Sammelstelle",
            "Wallbergstr. 4",
            "83620 Feldkirchen-Westerham",
        ],
        'sender_sign'     : [
            "Hochachtungsvoll",
            "Florian Handwerker",
            "Bundesgeschäftsführer, DIE LIBERTÄREN e.V.",
        ],
    },
    'die-partei-eu-2024': {
        'name'            : "Die PARTEI",
        'election'        : "Europawahl 2024",
        'deadline'        : "29.02.2024",
        'partyHref'       : "https://www.die-partei.de/europawahl-2024/",
        'partyHrefText'   : "die-partei.de/europawahl-2024/",
        'deadline'        : "29.02.2024",
        'minimum_age'     : "16",
        'minimum_support' : "4000",
        'pdf_form'        : "pdf_data/EU24_Die_Partei_UU_v2.pdf",
        'pdf_cover_letter': "pdf_data/Gemeindebuero_Anschreiben_PDV_v6.pdf",
        'download_name'   : "DIE_PARTEI_Unterstuetzungsunterschrift_EUWahl2024.pdf",
        'sender_phone'    : "+49 (0)152 5403 4785",         // pdv
        'sender_email'    : "info@parteidervernunft.de",
        'sender_addr'     : [
            "Die PARTEI",
            "Kopischstr. 10",
            "10965 Berlin",
            "mail@die-partei.de",
        ],
        'return_addr'     : [
            "Die PARTEI",
            "Kopischstr. 10",
            "10965 Berlin",
        ],
        'sender_sign'     : [
            // "Hochachtungsvoll",
            // "Martin Sonneborn",
            // "Vorsitzender, DIE PARTEI",
        ],
    },
}

function updateConfigText(configId) {
    const cfg = CONFIGS[configId]
    const htmlText = `
    <p>Damit die <b>${cfg.name}</b> zur ${cfg.election} antreten kann, müssen 4.000 bescheinigte Unterschriften bis zum ${cfg.deadline} gesammelt werden.</p>

    <p>Mehr Infos zur Wahl und zu den Kandidaten der Partei finden Sie auf <a target="_blank" rel="noopener noreferrer nofollow" href="${cfg.partyHref}">${cfg.partyHrefText}</a>, sowie auf <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.bundeswahlleiter.de/europawahlen/2024/informationen-wahlbewerber.html">bundeswahlleiter.de&ZeroWidthSpace;/europawahlen/2024/</a>.</p>
    `
    document.querySelector('.config-texts').innerHTML = htmlText;
}

const configOptionNodes = document.querySelectorAll(".config-option")

var selectedConfig = null;


function configClickHandler(id) {
    return function() {
        selectedConfig = id
        updateConfigText(selectedConfig)
        configOptionNodes.forEach(elem => elem.classList.remove('selected'))
        document.querySelector("#" + id).classList.add('selected')
    }
}

configOptionNodes.forEach(function(opt) {
    if (CONFIGS[opt.id] == null) {
        console.warn("Invalid config (maybe typo)", opt.id);
    }

    if (opt.classList.contains('selected')) {
        selectedConfig = opt.id
        updateConfigText(selectedConfig)
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
Bürgerbüro ${city['gemeinde']}<br>
${city['strasse']},<br>
${city['PLZ']}, ${city['ort']}
`.trim()
}

var adminSelect = null;

async function populateAdminAddress(value) {
    if (!value) {return}

    const valueParts = value.split(", ")
    const plz = valueParts[0]
    const ort = valueParts[1]
    const citiesUrl = "city_data/adr_" + plz.slice(0, 1) + ".json"

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
        var curCity = citiesData[i];
        if (curCity['PLZ'].substring(0, 3) != plz.substring(0, 3)) {
            continue
        }

        if (curCity['PLZ'] == plz && levenshtein(curCity['ort'], ort) < 2) {
            matchingCities.push(curCity)
        } else if (levenshtein(curCity['gemeinde'], ort) < 3) {
            matchingCities.push(curCity)
        } else if (levenshtein(curCity['ort'], ort) < 3) {
            matchingCities.push(curCity)
        } else if (curCity['PLZ'] == plz) {
            matchingCities.push(curCity)
        }
    }

    matchingCities.sort((a, b) => {
        var aIsMatch = a['PLZ'] == plz && levenshtein(a['gemeinde'], ort) < 2
        if (aIsMatch) { return -1; }
        var bIsMatch = b['PLZ'] == plz && levenshtein(b['gemeinde'], ort) < 2
        if (bIsMatch) { return 1; }

        aIsMatch = a['PLZ'] == plz && levenshtein(a['ort'], ort) < 2
        if (aIsMatch) { return -1; }
        bIsMatch = b['PLZ'] == plz && levenshtein(b['ort'], ort) < 2
        if (bIsMatch) { return 1; }

        aIsMatch = levenshtein(a['gemeinde'], ort) < 2
        if (aIsMatch) { return -1; }
        bIsMatch = levenshtein(b['gemeinde'], ort) < 2
        if (bIsMatch) { return 1; }
        
        aIsMatch = levenshtein(a['ort'], ort) < 2
        if (aIsMatch) { return -1; }
        bIsMatch = levenshtein(b['ort'], ort) < 2
        if (bIsMatch) { return 1; }
        
        aIsMatch = levenshtein(a['PLZ'], ort) < 2
        if (aIsMatch) { return -1; }
        bIsMatch = levenshtein(b['PLZ'], ort) < 2
        if (bIsMatch) { return 1; }
        
        return b['population'] - a['population']
    });

    function setSelectedAdminAddress(admin) {
        console.log([admin])
        const adminAddrNode = document.querySelector('.admin-address')
        if (admin == null || admin == "<br>") {
            adminAddrNode.innerHTML = "<div><span>Gemeinde: Unbekannt</span></div>";
            return
        }
        adminAddrNode.innerHTML = `
            <div><span>Gemeinde: </span>
                <span id='city-name'>${admin['gemeinde']}</span></div>
            <div><span>Straße: </span>
                <span id='city-street'>${admin['strasse']}</span></div>
            <div><span>Ort: </span>
                <span id='city-plz'>${admin['PLZ']}, ${admin['ort']}</span></div>
            <div><span>Phone: </span>
                <span id='city-phone'>${admin['phone'] || "-"}</span></div>
            <div><span>Email: </span>
                <span id='city-email'>${admin['email'] || "-"}</span></div>
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
            JSON.stringify(admin, null, 4),
            "```",
        ].join("\n"));

        const githubIssueRefNode = document.querySelector("a[href^='https://github.com/']")
        const githubIssueURL = new URL(githubIssueRefNode.href)

        githubIssueURL.search = ["?title=", title, "&body=", body].join("");
        githubIssueRefNode.href = githubIssueURL.href

        const teleRefNode = document.querySelector("a[href^='https://www.google.com/search']")
        const teleQuery = encodeURIComponent(`Telefonnummer Bürgeramt ${admin['gemeinde']} ${admin['strasse']} ${admin['PLZ']}, ${admin['ort']}`)
        teleRefNode.href = "https://www.google.com/search?q=" + teleQuery
    }

    if (matchingCities.length == 0) {
        document.querySelector('.admin-address').innerHTML = "-"
        return
    }

    var adminOptions = [
        {'value': "<br>", 'text': "bitte wählen", 'city': "<br>"}
    ]

    for (var i = 0; i < matchingCities.length; i++) {
        var city = matchingCities[i];
        adminOptions.push({
            'value': cityText(city),
            'text' : cityText(city),
            'city' : city,
        });
    }

    if (adminSelect != null) {
        adminSelect.destroy();
        adminSelect = null;
    }

    const addressSelectNode = document.querySelector('#admin-address-select')

    if (matchingCities.length == 0) {
        addressSelectNode.innerHTML = "-";
    } else if (matchingCities.length == 1) {
        addressSelectNode.innerHTML = '';
        setSelectedAdminAddress(matchingCities[0]);
    } else {
        addressSelectNode.innerHTML = '';
        adminSelect = new TomSelect("#admin-address-select", {
            options: adminOptions,
            allowEmptyOption: true,
            maxOptions: 20,
            maxItems: 1,
            create: false,
            render: {
                option: function(opt) {return '<div>' + opt.text + '</div>';},
                item  : function(opt) {return '<div>' + opt.text + '</div>';},
            }
        });

        adminSelect.on('change', function(text) {
            setSelectedAdminAddress(null)
            adminSelect.blur();
            for (var i = adminOptions.length - 1; i >= 0; i--) {
                if (cityText(adminOptions[i].city) == text) {
                    console.log("------", i)
                    setSelectedAdminAddress(adminOptions[i].city);
                }
            }
        });

        adminSelect.setValue(adminOptions[0].value);
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

    const plzBuffer = await fetch("postleitzahlen_2023_v3.json").then(res => res.arrayBuffer());
    const plzBytes = new TextDecoder().decode(plzBuffer);
    const plzData = JSON.parse(plzBytes)

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
}

window.addEventListener('load', initForm);


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

  const config = CONFIGS[selectedConfig];

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
