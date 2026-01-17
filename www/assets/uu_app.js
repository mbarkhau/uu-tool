
  const correctPassword = "raub";

  let input = prompt("Nicht für die Öffentlichkeit. Steuern sind?");

  if (input.toLowerCase() !== correctPassword) {
    document.body.innerHTML = "<h1 style='color:red;text-align:center;margin-top:20vh;'>Access denied</h1>";
    // or redirect: window.location = "https://example.com";
  }
  document.body.style.display = "block";
;

var uu_app = (function () {

// function fuzzyEqualsString(a, b) {
//   a = a.replaceAll(' ', '').toLowerCase()
//   b = b.replaceAll(' ', '').toLowerCase()
//   return a.includes(b)
// }

function formatNumber(num) {
  // 1234567.89 -> 1.234.567,89
  return num.toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    .replace(",", ".");
}

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


// Cache for loaded data
const dataCache = new Map();
const resolvers = new Map();

// Optimized data loading with caching
function loadJSONData(url) {
  return new Promise((resolve, reject) => {
    if (dataCache.has(url)) {
      resolve(dataCache.get(url))
    }
    if (!resolvers.has(url)) {
      resolvers.set(url, [])
      fetch(new Request(url, {priority: "low"}))
      .then(response => response.json())
      .then(data => {
        resolvers.get(url).forEach((_resolve) => {
          dataCache.set(url, data)
          _resolve(data)
        })
      })
    }
    resolvers.get(url).push(resolve)
  })
}

const scriptResolvers = new Map();
const completedScripts = new Set();

function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (completedScripts.has(url)) {
      resolve();
      return;
    }

    if (!scriptResolvers.has(url)) {
      scriptResolvers.set(url, []);
    }

    if (scriptResolvers.get(url).length == 0) {
      const script = document.createElement('script');
      script.src = url;
      script.onload = function() {
        completedScripts.add(url);
        scriptResolvers.get(url).forEach((_resolve) => {
          _resolve()
        });
      };
      document.head.appendChild(script);
    }
    scriptResolvers.get(url).push(resolve);
  });
}

function getConfigs() {
  return loadJSONData("data/config.json")
}

function renderElection(configs, electionID) {
  const electionCfg = configs.ELECTIONS[electionID]
  const electionDiv = document.createElement("div");
  electionDiv.classList.add("election");
  const logo = `img/logo_${electionID.split("-").slice(1).join("-")}.png`

  electionDiv.innerHTML = `
    <div class="election-header">
      <div class="logo">
        <img src="${logo}" alt="${electionCfg.name}">
      </div>
      <span>${electionCfg.name}</span>
    </div>
    <div class="election-info">
      <div>
        <span>Wahltag:</span>
        <span>${electionCfg.date}</span>
      </div>
      <div>
        <span>Abgabefrist:</span>
        <span>${electionCfg.deadline}</span>
      </div>
      <div>
        <span>Mindestalter:</span>
        <span>${electionCfg.minimum_age}</span>
      </div>
      <div>
        <span>Mindestzahl Unterschriften:</span>
        <span>${electionCfg.minimum_support}</span>
      </div>
      <div>
        <span>Wahlberechtigte:</span>
        <span>${electionCfg.electorate}</span>
      </div>
    </div>`;

    electionDiv.dataset.electionID = electionID;
    return electionDiv;
}

function renderSelection(configs, selectionID) {
  const selectionCfg = configs.SELECTIONS[selectionID];
    // "2026-ltw-bawue_buendnis-c" -> ["2026-ltw-bawue", "buendnis-c"]
  const logo = "img/logo_" + selectionID.split("_")[1] + ".png";

  const selectionNode = document.createElement("a");
  selectionNode.innerHTML = `
  <div class="logo">
      <img src="${logo}" alt="${selectionCfg.name}">
  </div>
  <div>
      <b title="${selectionCfg.name}">${selectionCfg.name}</b>
  </div>
  <div>
      Letztes Ergebnis: ${formatNumber(selectionCfg.lastResult || "-")}
  </div>
  <div>
      <a href="${selectionCfg.partyHref}">Webseite</a>
  </div>
  `
  selectionNode.classList.add("selection")
  selectionNode.href = `/formular.html?selectionID=${selectionID}`
  selectionNode.dataset.selectionID = selectionID;
  return selectionNode
}

function initIndexPage() {
  const player = document.getElementById("js-player");

  player && player.addEventListener("click", function () {
    if (document.querySelector("iframe") !== null) {
      return;
    }

    var apiScript = document.createElement("script");
    apiScript.src = "https://www.youtube.com/player_api";
    document.body.appendChild(apiScript);

    (function initPlayer() {
      if (window.YT && window.YT.Player) {
        new YT.Player(document.querySelector("#js-player"), {
          videoId: "BFSABttHAgs",
          host: "https://www.youtube-nocookie.com",
          playerVars: { autoplay: 1 },
        });
      } else {
        setTimeout(initPlayer, 10);
      }
    })();
  });
}

async function initSelectPage() {
  const electionsDiv = document.querySelector(".elections");
  const selectionsDiv = document.querySelector(".selections");

  if (!electionsDiv) {return;}

  async function renderSelections() {
    const electionDiv = document.querySelector(".elections .active");
    const electionID = electionDiv.dataset.electionID;
    const configs = await uu_app.getConfigs();
    const electionCfg = configs.ELECTIONS[electionID];

    selectionsDiv.innerHTML = "";
    let selections = Object.keys(configs.SELECTIONS);
    selections = selections.filter((selectionID) => {
      return selectionID.startsWith(electionID);
    });

    selections.sort((a, b) => {
      const aCfg = configs.SELECTIONS[a];
      const bCfg = configs.SELECTIONS[b];
      const aResult = aCfg.lastResult || 0;
      const bResult = bCfg.lastResult || 0;
      if (aResult == 0 && bResult == 0) {
        return aCfg.name.localeCompare(bCfg.name);
      }
      return bResult - aResult;
    });

    const headerDiv = document.querySelector(".selections-description")
    headerDiv.innerHTML = `Parteien die zur ${electionCfg.name} antreten wollen.`

    selections.forEach((selectionID) => {
      let selectionNode = uu_app.renderSelection(configs, selectionID)
      selectionsDiv.appendChild(selectionNode)
    })
  }

    // the first election is the default
  const configs = await uu_app.getConfigs();
  const currentElectionID = Object.keys(configs.ELECTIONS)[0];

  electionsDiv.innerHTML = "";

  Object.entries(configs.ELECTIONS).forEach(([electionID, electionCfg]) => {
    if (electionCfg.inactive) {return}

      let electionDiv = uu_app.renderElection(configs, electionID)
    if (electionID === currentElectionID) {
      electionDiv.classList.add("active");
    }

    electionDiv.addEventListener("click", function (event) {
      let target = event.target;
      while (!target.classList.contains("election")) {
        target = target.parentElement;
      }

      const electionDivs = document.querySelectorAll(".elections > div");
      electionDivs.forEach(function (electionDiv) {
        electionDiv.classList.remove("active")
      })
      target.classList.add("active")
      renderSelections()
      document.querySelector("#select-party")
      .scrollIntoView({alignToTop: true, behavior: 'smooth'})
    })
    electionsDiv.appendChild(electionDiv);
  })

  renderSelections()
}

function makePLZOptions(plzData) {
  var options = []
  for (const [plz, placeNames] of Object.entries(plzData)) {
    for (var i = 0; i < placeNames.length; i++) {
      const entry = plz + ", " + placeNames[i];
      options.push({'text': entry, 'value': entry})
    }
  }
  return options;
}

async function initFormularPage() {
  const configs = await uu_app.getConfigs()

  const urlParams = new URLSearchParams(window.location.search);
  const selectionID = urlParams.get("selectionID");
  const electionID = selectionID.split("_")[0];

  console.log("selection", electionID, selectionID)
  const electionCfg = configs.ELECTIONS[electionID];
  const selectionCfg = configs.SELECTIONS[selectionID];

  console.log(selectionCfg)
  console.log(electionCfg)

    // set href on template node
  const downloadPdfTemplate = document.querySelector(".download-pdf-template")
  downloadPdfTemplate.href = `/pdf/${selectionID}.pdf`

  const electionDiv = uu_app.renderElection(configs, electionID)
  const selectionDiv = uu_app.renderSelection(configs, selectionID)

  document.querySelector(".elections").appendChild(electionDiv)
  document.querySelector(".selections").appendChild(selectionDiv)

    // preload scripts and data
  loadScript("lib/pdf-lib.js")
  loadScript("lib/download.js")
  loadScript("lib/tom-select.complete.js")

  await loadScript("lib/tom-select.complete.js")
  plzSelect = new TomSelect('select[name=postleitzahl]', {
    load: async function(query, callback) {
      if (query.length < 2) {
        return callback([])
      }
      let dataURL = `data/plz_data.json`
      if (/^\d{2,5}/.test(query)) {
        const dirPrefix = query.slice(0, 1)
        const filePrefix = query.slice(0, 2)
        loadJSONData(`data/${dirPrefix}/buero_${filePrefix}.json`)
        dataURL = `data/${dirPrefix}/plz_${filePrefix}.json`
      }
      const plzData = await loadJSONData(dataURL)
      callback(makePLZOptions(plzData))
    },
    allowEmptyOption: true,
    maxOptions: 50,
    maxItems: 1,
    create: false,
  });
  plzSelect.on('change', function(value) {
    plzSelect.blur();
    setTimeout(() => populateBueroAddress(value));
  });
  plzSelect.on('dropdown_open', function() {
    plzSelect.clear()
  });

  // lazy prefetch plz data
  for (const plzPrefix of (electionCfg.loadPLZ || [])) {
    const dirPrefix = plzPrefix.slice(0, 1)
    loadJSONData(`data/${dirPrefix}/plz_${plzPrefix}.json`)
  }
}

function getFormField(name) {
  var field = document.getElementsByName(name)[0];
  if (!field) {
    field = document.getElementById(name);
  }
  return field;
}


function cityText(city) {
return `
Bürgerbüro ${city['name']}<br>
${city['street']},<br>
${city['plz']}, ${city['ort']}
`.trim()
}


var plzSelect = null;

var bueroSelect = null;


async function populateBueroAddress(value) {
  if (!value) {return}

  const valueParts = value.split(", ")
  const plz = valueParts[0]
  const ort = valueParts[1]
  const dirPrefix = plz.slice(0, 1)
  const filePrefix = plz.slice(0, 2)
  const citiesUrl = `data/${dirPrefix}/buero_${filePrefix}.json`
  const citiesData = await loadJSONData(citiesUrl)

  const matchingCities = []

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
    var bIsMatch = b['plz'] == plz && b['name'] && levenshtein(b['name'], ort) < 2
    if (bIsMatch) { return 1; }

    aIsMatch = a['plz'] == plz && levenshtein(a['ort'], ort) < 2
    if (aIsMatch) { return -1; }
    bIsMatch = b['plz'] == plz && levenshtein(b['ort'], ort) < 2
    if (bIsMatch) { return 1; }

    aIsMatch = a['name'] && levenshtein(a['name'], ort) < 2
    if (aIsMatch) { return -1; }
    bIsMatch = b['name'] && levenshtein(b['name'], ort) < 2
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

  function setSelectedBueroAddress(buero) {
    const bueroAddrNode = document.querySelector('.buero-address')
    if (buero == null || buero == "<br>") {
      bueroAddrNode.innerHTML = "<div><span>Gemeinde: Unbekannt</span></div>";
      return
    }
    bueroAddrNode.innerHTML = `
      <div><span>Gemeinde: </span>
        <span id='city-name'>${buero['name']}</span></div>
      <div><span>Straße: </span>
        <span id='city-street'>${buero['street']}</span></div>
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
    const teleQuery = encodeURIComponent(`Telefonnummer Bürgeramt ${buero['ort'] || buero['name']} ${buero['street']} ${buero['PLZ']}, ${buero['ort']}`)
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
    setSelectedBueroAddress(matchingCities[0]);
  } else {
    addressSelectNode.innerHTML = '';
    await loadScript("lib/tom-select.complete.js")
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
      setSelectedBueroAddress(null)
      bueroSelect.blur();
      for (var i = bueroOptions.length - 1; i >= 0; i--) {
        if (cityText(bueroOptions[i].city) == text) {
          setSelectedBueroAddress(bueroOptions[i].city);
        }
      }
    });

    bueroSelect.setValue(bueroOptions[0].value);
    setSelectedBueroAddress(bueroOptions[0].city);
  }
}


function validateForm() {
  getFormField('download').disabled = true;

  const lastnameField = getFormField('lastname');
  if (lastnameField.value.length == 0) {
    return lastnameField.classList.add('warn');
  } else {
    lastnameField.classList.remove('warn');
  }

  const firstnameField = getFormField('firstname');
  if (firstnameField.value.length == 0) {
    return firstnameField.classList.add('warn');
  } else {
    firstnameField.classList.remove('warn');
  }

  const birthdayField = getFormField('birthday');
  if (birthdayField.value.length == 0 && birthdayField.value.length != 10) {
    return birthdayField.classList.add('warn')
  } else {
    birthdayField.classList.remove('warn')
  }

  const streetField = getFormField('street');
  if (streetField.value.length == 0) {
    return streetField.classList.add('warn');
  } else {
    streetField.classList.remove('warn');
  }

  const plzField = getFormField('postleitzahl');
  if (plzField.value.length == 0 && plzField.value.length == 6) {
    return plzField.classList.add('warn');
  } else {
    plzField.classList.remove('warn');
  }
  getFormField('download').disabled = false;
}


// onclick handler
async function generatePDF() {
  await loadScript("lib/pdf-lib.js")
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

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

  const urlParams = new URLSearchParams(window.location.search);
  const selectionID = urlParams.get("selectionID");

  const configs = await uu_app.getConfigs()
  const selectionCfg = configs.SELECTIONS[selectionID];

  async function loadPDF(url) {
    var isHTTP = location.protocol == 'http:';
    const pdfBytes = await fetch(url).then(res => res.arrayBuffer())
    return await PDFDocument.load(pdfBytes, {ignoreEncryption: isHTTP})
  }

  const pdfDoc1 = await loadPDF(`/pdf/${selectionID}.pdf`)
  const pdfDoc2 = await loadPDF(`/pdf/Anschreiben_v7.pdf`)

  const [page1, page2] = await pdfDoc.copyPages(pdfDoc1, [0, 1])
  const [page3] = await pdfDoc.copyPages(pdfDoc2, [0])

  // Update pdf content from form

  for (var i = 0; i < selectionCfg['sender_addr'].length; i++) {
    var line = selectionCfg['sender_addr'][i];
    drawText(page3, 340, 735 - i * 15, (i ? sansRegular : sansBold), line)
  }

  for (var i = 0; i < selectionCfg['return_addr'].length; i++) {
    var line = selectionCfg['return_addr'][i];
    drawText(page3, 235, 330 - i * 13, (i ? sansRegular : sansBold), line)
  }

  for (var i = 0; i < selectionCfg['sender_sign'].length; i++) {
    var line = selectionCfg['sender_sign'][i];
    drawText(page3, 71, 110 - i * 14, sansRegular, line)
  }

  const lastnameField  = getFormField('lastname');
  const firstnameField = getFormField('firstname');
  const birthdayField  = getFormField('birthday');
  const streetField    = getFormField('street');
  const plzField       = getFormField('postleitzahl');

  const birthdayValue = birthdayField.value.split("-").reverse().join(".")

  drawText(page1, 66, 520, serifBold, lastnameField.value)
  drawText(page1, 66, 497, serifBold, firstnameField.value)
  drawText(page1, 366, 497, serifBold, birthdayValue)
  drawText(page1, 66, 460, serifBold, streetField.value)
  drawText(page1, 66, 435, serifBold, plzField.value)

  try {
    const cityNameField = getFormField('city-name');
    drawText(page3, 71, 690, sansBold, cityNameField.innerText)
    drawText(page3, 71, 674, sansBold, "Gemeindeverwaltung/Bürgeramt")
  } catch (err) {console.log(err)}

  try {
    const cityStreetField = getFormField('city-street');
    drawText(page3, 71, 658, sansRegular, cityStreetField.innerText)
  } catch (err) {console.log(err)}

  try {
    const cityPlzField    = getFormField('city-plz');
    drawText(page3, 71, 642, sansRegular, cityPlzField.innerText)
  } catch (err) {console.log(err)}

  pdfDoc.addPage(page1)
  pdfDoc.addPage(page2)
  pdfDoc.addPage(page3)

  const pdfBytes = await pdfDoc.save()

  // Trigger the browser to download the PDF document
  await loadScript("lib/download.js")
  download(pdfBytes, `uu_formular_${selectionID}.pdf`, "application/pdf");

  return false;
}

const ROUTES = {
  "/index.html": initIndexPage,
  "/select.html": initSelectPage,
  "/formular.html": initFormularPage
}

function selectRoute(event) {
  ROUTES[window.location.pathname](event)
}

document.addEventListener("DOMContentLoaded", selectRoute);

return {
  getConfigs: getConfigs,
  renderElection: renderElection,
  renderSelection: renderSelection,
  generatePDF: generatePDF,
};

})();
