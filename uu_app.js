
const { PDFDocument, StandardFonts, rgb } = PDFLib

const CONFIGS = {
    'pdv-eu-2024': {
        'deadline'        : "29.02.2024",
        'minimum_age'     : "16",
        'minimum_support' : "4000",
        'pdf_form'        : "pdf_data/EUWahl2024_PDV_UU_Formular_v2.pdf",
        'pdf_cover_letter': "pdf_data/Gemeindebuero_Anschreiben_PDV_v4.pdf",
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
    }
}

function levenshtein(s1, s2) {
    // CC BY-SA 3.0 - https://stackoverflow.com/q/18516942/62997
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

async function populateAdminAddress(value) {
    if (!value) {
        return
    }

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

        if (curCity['PLZ'] == plz && fuzzyEqualsString(curCity['ort'], ort)) {
            matchingCities.push(curCity)
        } else if (fuzzyEqualsString(curCity['gemeinde'], ort)) {
            matchingCities.push(curCity)
        } else if (fuzzyEqualsString(curCity['ort'], ort)) {
            matchingCities.push(curCity)
        } else if (curCity['PLZ'] == plz) {
            matchingCities.push(curCity)
        }
    }

    matchingCities.sort((a, b) => {
        var aIsMatch = a['PLZ'] == plz && fuzzyEqualsString(a['gemeinde'], ort)
        if (aIsMatch) { return -1; }
        var bIsMatch = b['PLZ'] == plz && fuzzyEqualsString(b['gemeinde'], ort)
        if (bIsMatch) { return 1; }

        aIsMatch = a['PLZ'] == plz && fuzzyEqualsString(a['ort'], ort)
        if (aIsMatch) { return -1; }
        bIsMatch = b['PLZ'] == plz && fuzzyEqualsString(b['ort'], ort)
        if (bIsMatch) { return 1; }

        aIsMatch = fuzzyEqualsString(a['gemeinde'], ort)
        if (aIsMatch) { return -1; }
        bIsMatch = fuzzyEqualsString(b['gemeinde'], ort)
        if (bIsMatch) { return 1; }
        
        aIsMatch = fuzzyEqualsString(a['ort'], ort)
        if (aIsMatch) { return -1; }
        bIsMatch = fuzzyEqualsString(b['ort'], ort)
        if (bIsMatch) { return 1; }
        
        aIsMatch = fuzzyEqualsString(a['PLZ'], ort)
        if (aIsMatch) { return -1; }
        bIsMatch = fuzzyEqualsString(b['PLZ'], ort)
        if (bIsMatch) { return 1; }
        
        return b['population'] - a['population']
    });

    const addressNode = document.querySelector('.admin-address')

    if (matchingCities.length == 0) {
        addressNode.innerHTML = "-"
        formField('download').disabled = true;
        return
    }

    console.log("----------")
    for (var i = 0; i < matchingCities.length; i++) {
        console.log(matchingCities[i])
    }

    var bestCity = matchingCities[0];

    addressNode.innerHTML = `
        <div><span>Gemeinde/Stadt: </span><span id='city-name'>${bestCity['gemeinde']}</span></div>
        <div><span>Straße: </span><span id='city-street'>${bestCity['strasse']}</span></div>
        <div><span>Ort: </span><span id='city-plz'>${bestCity['PLZ']}, ${bestCity['ort']}</span></div>
    `;

    const githubIssueRefNode = document.querySelector("a[href^='https://github.com/']")
    const githubIssueURL = new URL(githubIssueRefNode.href)
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
        JSON.stringify(curCity, null, 4),
        "```",
    ].join("\n"));
    githubIssueURL.search = ["?title=", title, "&body=", body].join("");
    githubIssueRefNode.href = githubIssueURL.href

    const teleRefNode = document.querySelector("a[href^='https://www.google.com/search']")
    const teleQuery = encodeURIComponent(`Telefonnummer Bürgeramt ${bestCity['gemeinde']} ${bestCity['strasse']} ${bestCity['PLZ']}, ${bestCity['ort']}`)
    teleRefNode.href = "https://www.google.com/search?q=" + teleQuery

    formField('download').disabled = false;
}

async function validateForm() {
    const plzBuffer = await fetch("postleitzahlen_2023.json").then(res => res.arrayBuffer());
    const plzBytes = new TextDecoder().decode(plzBuffer);
    const plzData = JSON.parse(plzBytes)

    const plzOptions = plzData.map(function (item) {
        const plz = item[0]
        const ort = item[1];
        return {'label': plz + ", " + ort, "value": plz + ", " + ort};
    });

    const plzSelect = new TomSelect('select[name=postleitzahl]', {
        labelField: 'label',
        valueField: 'value',
        searchField: 'label',
        options: plzOptions,
        maxItems: 1,
        maxOptions: 50,
        allowEmptyOption: true,
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

window.addEventListener('load', validateForm);

async function downloadPDF() {
  const pdfDoc = await PDFDocument.create();

  const sansRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  // const serifRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

  function drawText(page, posX, posY, font, text) {
    page.drawText(text, {
        x: posX,
        y: posY,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      })
  }

  const config = CONFIGS['pdv-eu-2024'];

  async function loadPDF(url) {
    var isHTTPS = false;
    const pdfBytes = await fetch(url).then(res => res.arrayBuffer())
    return await PDFDocument.load(pdfBytes, {ignoreEncryption: !isHTTPS})
  }

  const pdfDoc1 = await loadPDF(config['pdf_form'])
  const pdfDoc2 = await loadPDF(config['pdf_cover_letter'])

  const [page1, page2] = await pdfDoc.copyPages(pdfDoc1, [0, 1])
  const [page3] = await pdfDoc.copyPages(pdfDoc2, [0])

  // Update pdf content from form

  const lastnameField  = formField('lastname');
  const firstnameField = formField('firstname');
  const birthdayField  = formField('birthday');
  const streetField    = formField('street');
  const plzField       = formField('postleitzahl');

  const cityNameField   = formField('city-name');
  const cityStreetField = formField('city-street');
  const cityPlzField    = formField('city-plz');

  const birthdayValue = birthdayField.value.split("-").reverse().join(".")

  drawText(page1, 66, 520, serifBold, lastnameField.value)
  drawText(page1, 66, 497, serifBold, firstnameField.value)
  drawText(page1, 366, 497, serifBold, birthdayValue)
  drawText(page1, 66, 460, serifBold, streetField.value)
  drawText(page1, 66, 435, serifBold, plzField.value)

  drawText(page3, 71, 690, sansBold, cityNameField.innerText)
  drawText(page3, 71, 674, sansBold, "Gemeindeverwaltung/Bürgeramt")
  drawText(page3, 71, 658, sansRegular, cityStreetField.innerText)
  drawText(page3, 71, 642, sansRegular, cityPlzField.innerText)

  for (var i = 0; i < config['sender_addr'].length; i++) {
    var line = config['sender_addr'][i];
    drawText(page3, 340, 735 - i * 15, (i ? sansRegular : sansBold), line)
  }

  for (var i = 0; i < config['return_addr'].length; i++) {
    var line = config['return_addr'][i];
    drawText(page3, 235, 295 - i * 13, (i ? sansRegular : sansBold), line)
  }

  for (var i = 0; i < config['sender_sign'].length; i++) {
      var line = config['sender_sign'][i];
      drawText(page3, 71, 129 - i * 14, sansRegular, line)
  }

  pdfDoc.addPage(page1)
  pdfDoc.addPage(page2)
  pdfDoc.addPage(page3)

  const pdfBytes = await pdfDoc.save()

  // Trigger the browser to download the PDF document
  download(pdfBytes, config['download_name'], "application/pdf");

  return false;
}

