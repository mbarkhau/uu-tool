
const { PDFDocument, StandardFonts, rgb } = PDFLib

const CONFIGS = {
    'pdv-eu-2024': {
        'deadline'        : "29.02.2024",
        'minimum_age'     : "16",
        'minimum_support' : "4000",
        'pdf_form'        : "pdf_data/EUWahl2024_PDV_UU_Formular_v2.pdf",
        'pdf_cover_letter': "pdf_data/Gemeindebuero_Anschreiben_PDV_v2.pdf",
        'download_name'   : "PDV_Unterstuetzungsunterschrift_EUWahl2024.pdf",
        'sender_phone'    : "+49 (0)152 5403 4785",         // pdv
        'sender_email'    : "info@parteidervernunft.de",
        'sender_addr'     : [
            "Partei der Vernunft",
            "Bundesgeschäftsstelle",
            "Postfach 10 15 24",
            "01691 Freital",
        ],
        'return_addr'     : [
            "Florian Handwerker",
            "Wallbergstr. 4",
            "83620 Feldkirchen-Westerham",
        ],
    }
}

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

    var bestCity = null;
    for (var i = citiesData.length - 1; i >= 0; i--) {
        var curCity = citiesData[i];
        if (curCity['PLZ'] == plz && curCity['ort'] == ort) {
            bestCity = curCity;
        }
        if (!bestCity && curCity['ort'] == ort) {
            bestCity = curCity;
        }
        // else if (curCity['PLZ'].slice(0, 4) == plz.slice(0, 4)) {
        //     bestCity = curCity;
        //     console.log("populate addr from plz 4", curCity);
        // } else if (curCity['PLZ'].slice(0, 3) == plz.slice(0, 3)) {
        //     bestCity = curCity;
        //     console.log("populate addr from plz 5", curCity);
        // } else if (curCity['ort'] == ort) {
        //     bestCity = curCity;
        //     console.log("populate addr from city", curCity);
        // }
    }

    const addressNode = document.querySelector('.admin-address')
    addressNode.innerHTML = `
        <div><span>Gemeinde/Stadt: </span><span id='city-name'>${bestCity['gemeinde']}</span></div>
        <div><span>Straße: </span><span id='city-street'>${bestCity['strasse']}</span></div>
        <div><span>Ort: </span><span id='city-plz'>${bestCity['PLZ']}, ${bestCity['ort']}</span></div>
    `;

    const teleRefNode = document.querySelector("a[href^='https://www.google.com/search']")
    const teleQuery = encodeURIComponent(`Telefonnummer Bürgerbüro ${bestCity['gemeinde']} ${bestCity['strasse']} ${bestCity['PLZ']}, ${bestCity['ort']}`)
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

  const existingPdfBytes1 = await fetch(config['pdf_form']).then(res => res.arrayBuffer())
  const pdfDoc1 = await PDFDocument.load(existingPdfBytes1, {ignoreEncryption: true})

  const existingPdfBytes2 = await fetch(config['pdf_cover_letter']).then(res => res.arrayBuffer())
  const pdfDoc2 = await PDFDocument.load(existingPdfBytes2, {ignoreEncryption: true})

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

  drawText(page3, 71, 704, sansBold, cityNameField.innerText)
  drawText(page3, 71, 688, sansBold, "Bürgerbüro")
  drawText(page3, 71, 672, sansRegular, cityStreetField.innerText)
  drawText(page3, 71, 656, sansRegular, cityPlzField.innerText)

  pdfDoc.addPage(page1)
  pdfDoc.addPage(page2)
  pdfDoc.addPage(page3)

  const pdfBytes = await pdfDoc.save()

  // Trigger the browser to download the PDF document
  download(pdfBytes, config['download_name'], "application/pdf");

  return false;
}
