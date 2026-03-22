var uu_app = (function () {

  // function fuzzyEqualsString(a, b) {
  //   a = a.replaceAll(' ', '').toLowerCase()
  //   b = b.replaceAll(' ', '').toLowerCase()
  //   return a.includes(b)
  // }

  function formatDateDe(dateStr) {
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr.split("-").reverse().join(".");
    }
    return dateStr;
  }

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

    if (s1 === s2) { return 0; }

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

  function loadJSONData(url) {
    return new Promise((resolve, reject) => {
      if (dataCache.has(url)) {
        return resolve(dataCache.get(url));
      }

      if (resolvers.has(url)) {
        resolvers.get(url).push(resolve);
        return;
      }

      resolvers.set(url, [resolve]);
      fetch(new Request(url, { priority: "low" }))
        .then(response => response.json())
        .then(data => {
          dataCache.set(url, data);
          const callbacks = resolvers.get(url);
          resolvers.delete(url);
          callbacks.forEach(_resolve => _resolve(data));
        })
        .catch(err => {
          const callbacks = resolvers.get(url);
          resolvers.delete(url);
          callbacks.forEach(_resolve => reject(err));
        });
    })
  }

  function loadPDFData(url) {
    return new Promise((resolve, reject) => {
      if (dataCache.has(url)) {
        return resolve(dataCache.get(url));
      }

      if (resolvers.has(url)) {
        resolvers.get(url).push(resolve);
        return;
      }

      resolvers.set(url, [resolve]);
      fetch(url)
        .then(res => res.arrayBuffer())
        .then(pdfBytes => {
          dataCache.set(url, pdfBytes);
          const callbacks = resolvers.get(url);
          resolvers.delete(url);
          callbacks.forEach(_resolve => _resolve(pdfBytes));
        })
        .catch(err => {
          const callbacks = resolvers.get(url);
          resolvers.delete(url);
          callbacks.forEach(_resolve => reject(err));
        });
    });
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
        script.onload = function () {
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

  function filterElectionSelections(configs, electionID) {
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
    return selections
  }

  function renderElection(configs, electionID) {
    const electionCfg = configs.ELECTIONS[electionID]
    const electionDiv = document.createElement("div");
    electionDiv.classList.add("election");
    const logo = `img/logo_${electionID.split("-").slice(1).join("-")}.png`
    const selections = filterElectionSelections(configs, electionID)

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
        <span>${formatDateDe(electionCfg.date)}</span>
      </div>
      <div>
        <span>Abgabefrist:</span>
        <span>${formatDateDe(electionCfg.deadline)}</span>
      </div>
      <div>
        <span>Wahlperiode:</span>
        <span>${formatDateDe(electionCfg.periode)}</span>
      </div>
      <div>
        <span>Mindestalter:</span>
        <span>${electionCfg.minimum_age}</span>
      </div>
      <div>
        <span>Wahlberechtigte:</span>
        <span>${electionCfg.electorate}</span>
      </div>
      <div>
        <span>Parteien/Wahllisten</span>
        <span>${selections.length}</span>
      </div>
      <div>
        <span>Benötigte<br>Unterschriften:</span>
        <span>${electionCfg.minimum_support}</span>
      </div>
    </div>
${electionCfg.info_urls && electionCfg.info_urls.length > 0 ? `    <div class="election-info-urls">
      ${electionCfg.info_urls.map(url => `<a href="${url.href}" target="_blank" rel="noopener">${url.text}</a>`).join("\n      &bull;\n      ")}
    </div>` : ''}`;

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
      <span>Letztes Ergebnis:</span> <span>${formatNumber(selectionCfg.lastResult || "-")}</span>
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

  async function initWahlPage() {
    const electionsDiv = document.querySelector(".elections");
    if (!electionsDiv) { return; }

    const configs = await uu_app.getConfigs();
    electionsDiv.innerHTML = "";

    const activeElections = [];
    Object.entries(configs.ELECTIONS).forEach(([electionID, electionCfg]) => {
      if (1 || electionCfg.active) {
        electionCfg.id = electionID;
        activeElections.push(electionCfg)
      }
    })
    activeElections.sort((a, b) => b.date.localeCompare(a.date))

    const electionHeaderDiv = document.querySelector("#select-election")
    if (activeElections.length === 0) {
      if (electionHeaderDiv) electionHeaderDiv.style.display = "none"
      return
    } else {
      if (electionHeaderDiv) electionHeaderDiv.style.display = "block"
    }

    activeElections.forEach((electionCfg, i) => {
      let electionDiv = renderElection(configs, electionCfg.id)

      electionDiv.addEventListener("click", function (event) {
        window.location.href = `/partei.html?electionID=${electionCfg.id}`;
      })
      electionsDiv.appendChild(electionDiv);
    })
  }

  async function initParteiPage() {
    const selectionsDiv = document.querySelector(".selections");
    if (!selectionsDiv) { return; }

    const urlParams = new URLSearchParams(window.location.search);
    const electionID = urlParams.get("electionID");

    if (!electionID) {
      window.location.href = "/wahl.html";
      return;
    }

    const configs = await uu_app.getConfigs();
    const electionCfg = configs.ELECTIONS[electionID];

    const selections = filterElectionSelections(configs, electionID)
    selectionsDiv.innerHTML = "";

    const cleanedName = (
      electionCfg.name
        .replaceAll("-<br>", "")
        .replaceAll("<br>", " ")
        .replaceAll("&nbsp;", " ")
    )
    const selectionsHeaderDiv = document.querySelector(".selections-description")
    if (selectionsHeaderDiv) {
      selectionsHeaderDiv.innerHTML = `Parteien die zur ${cleanedName} antreten wollen.`
    }

    selections.forEach((selectionID) => {
      let selectionNode = renderSelection(configs, selectionID)
      selectionsDiv.appendChild(selectionNode)
    })
  }

  function makePLZOptions(plzData) {
    var options = []
    for (const [plz, placeNames] of Object.entries(plzData)) {
      for (var i = 0; i < placeNames.length; i++) {
        const entry = plz + ", " + placeNames[i];
        options.push({ 'text': entry, 'value': entry })
      }
    }
    return options;
  }

  function plzUrls(plz) {
    const dirPrefix = plz.slice(0, 1)
    const plzPrefix = plz.slice(0, 2)
    return {
      plzData: `data/${dirPrefix}/plz_${plzPrefix}.json`,
      bueroData: `data/${dirPrefix}/buero_${plzPrefix}.json`
    }
  }

  function getFormField(name) {
    var field = document.getElementsByName(name)[0];
    if (!field) {
      field = document.getElementById(name);
    }
    return field;
  }

  async function initFormularPage() {
    const configs = await uu_app.getConfigs()

    const urlParams = new URLSearchParams(window.location.search);
    const selectionID = urlParams.get("selectionID");
    if (!selectionID) {
      window.location.href = "/wahl.html";
      return;
    }

    const electionID = selectionID.split("_")[0];

    const electionCfg = configs.ELECTIONS[electionID];
    const selectionCfg = configs.SELECTIONS[selectionID];

    // preload scripts and plz data
    setTimeout(function () {
      loadScript("lib/download.js")
      loadScript("lib/pdf-lib.js")

      for (const plzPrefix of (electionCfg.loadPLZ || [])) {
        var urls = plzUrls(plzPrefix)
        loadJSONData(urls.plzData)
        loadJSONData(urls.bueroData)
      }
    }, 2000)

    // set href on template node
    const downloadPdfTemplate = document.querySelector(".download-pdf-template")
    downloadPdfTemplate.href = `/pdf/${selectionID}.pdf`

    const electionDiv = renderElection(configs, electionID)
    const selectionDiv = renderSelection(configs, selectionID)

    document.querySelector(".elections").appendChild(electionDiv)
    document.querySelector(".selections").appendChild(selectionDiv)

    await loadScript("lib/tom-select.complete.js")

    plzSelect = new TomSelect('select[name=postleitzahl]', {
      load: async function (query, callback) {
        if (query.length < 2) {
          return callback([])
        }

        if (/^\d{2,5}/.test(query)) {
          var urls = plzUrls(query.slice(0, 2))
          const plzData = await loadJSONData(urls.plzData)
          callback(makePLZOptions(plzData))
        } else {
          const plzData = await loadJSONData(`data/plz_data.json`)
          callback(makePLZOptions(plzData))
        }

      },
      allowEmptyOption: true,
      maxOptions: 50,
      maxItems: 1,
      create: false,
    });
    plzSelect.on('change', function (value) {
      plzSelect.blur();
      setTimeout(() => populateBueroAddress(value));
    });
    plzSelect.on('dropdown_open', function () {
      plzSelect.clear()
    });

    ['lastname', 'firstname', 'birthday', 'street'].forEach(name => {
      const field = getFormField(name);
      if (field) {
        field.addEventListener('change', validateForm);
        field.addEventListener('input', validateForm);
      }
    });

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
    if (!value) { return }

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
      { 'value': "<br>", 'text': "bitte wählen", 'city': "<br>" }
    ]

    for (var i = 0; i < matchingCities.length; i++) {
      var city = matchingCities[i];
      bueroOptions.push({
        'value': cityText(city),
        'text': cityText(city),
        'city': city,
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
          option: function (opt) { return '<div>' + opt.text + '</div>'; },
          item: function (opt) { return '<div>' + opt.text + '</div>'; },
        }
      });

      bueroSelect.on('change', function (text) {
        setSelectedBueroAddress(null)
        bueroSelect.blur();
        for (var i = bueroOptions.length - 1; i >= 0; i--) {
          if (cityText(bueroOptions[i].city) == text) {
            setSelectedBueroAddress(bueroOptions[i].city);
            validateForm();
            return
          }
        }
      });

      bueroSelect.setValue(bueroOptions[0].value);
      setSelectedBueroAddress(bueroOptions[0].city);
    }
  }

  function validateForm() {
    let downloadDisabled = false

    const lastnameField = getFormField('lastname');
    if (lastnameField.value.length == 0) {
      downloadDisabled = true;
      lastnameField.classList.add('warn');
    } else {
      lastnameField.classList.remove('warn');
    }

    const firstnameField = getFormField('firstname');
    if (firstnameField.value.length == 0) {
      downloadDisabled = true;
      firstnameField.classList.add('warn');
    } else {
      firstnameField.classList.remove('warn');
    }

    const birthdayField = getFormField('birthday');
    if (birthdayField.value.length == 0 && birthdayField.value.length != 10) {
      downloadDisabled = true;
      birthdayField.classList.add('warn')
    } else {
      birthdayField.classList.remove('warn')
    }

    const streetField = getFormField('street');
    if (streetField.value.length == 0) {
      downloadDisabled = true;
      streetField.classList.add('warn');
    } else {
      streetField.classList.remove('warn');
    }

    const plzField = getFormField('postleitzahl');
    if (!/^[0-9]{5}.*/.test(plzField.value)) {
      downloadDisabled = true;
      plzField.classList.add('warn');
    } else {
      plzField.classList.remove('warn');
    }

    getFormField('download').disabled = downloadDisabled;
  }

  // onclick handler
  async function generatePDF() {
    const btn = getFormField('download');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    let progress = 0;
    const updateProgress = (text) => {
      btn.innerHTML = `PDF wird generiert<br/>(${progress}/5) ... ${text}`;
      progress++;
    };

    const urlParams = new URLSearchParams(window.location.search);
    const selectionID = urlParams.get("selectionID");

    updateProgress("preloading pdf templates");
    loadPDFData(`/pdf/${selectionID}.pdf`)
    loadPDFData(`/pdf/Anschreiben_v7.pdf`)

    try {

      updateProgress("loading pdf-lib.js");
      await loadScript("lib/pdf-lib.js");

      const { PDFDocument, StandardFonts, rgb } = PDFLib;
      async function loadPDF(url) {
        const isHTTP = location.protocol == 'http:';
        const pdfBytes = await loadPDFData(url)
        return await PDFDocument.load(pdfBytes, { ignoreEncryption: isHTTP })
      }

      updateProgress("generating pdf");
      const pdfDoc = await PDFDocument.create();

      const sansRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      // const serifRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman)
      const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

      function drawText(page, posX, posY, font, text) {
        page.drawText(text, {
          x: posX,
          y: posY,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
      }

      function drawDebugGrid(page) {
        const { width, height } = page.getSize();
        for (let x = 10; x < width; x += 10) {
          page.drawLine({
            start: { x: x, y: 0 },
            end: { x: x, y: height },
            thickness: x % 50 === 0 ? (x % 100 === 0 ? 1 : 0.5) : 0.05,
            color: rgb(1, 0, 0),
          });
          if (x % 100 === 0) {
            page.drawText(x.toString(), {
              x: x + 2,
              y: 12,
              size: 8,
              font: sansRegular,
              color: rgb(1, 0, 0),
            });
          }
        }
        for (let y = 10; y < height; y += 10) {
          page.drawLine({
            start: { x: 0, y: y },
            end: { x: width, y: y },
            thickness: y % 50 === 0 ? (y % 100 === 0 ? 1 : 0.5) : 0.05,
            color: rgb(1, 0, 0),
          });
          if (y % 100 === 0) {
            page.drawText(y.toString(), {
              x: 2,
              y: y + 2,
              size: 8,
              font: sansRegular,
              color: rgb(1, 0, 0),
            });
          }
        }
      }

      const configs = await uu_app.getConfigs();
      const selectionCfg = configs.SELECTIONS[selectionID];
      const coords = selectionCfg.pdfCoords;

      updateProgress("loading pdf1");
      const pdfDoc1 = await loadPDF(`/pdf/${selectionID}.pdf`);
      updateProgress("loading pdf2");
      const pdfDoc2 = await loadPDF(`/pdf/Anschreiben_v7.pdf`);

      const [page1, page2] = await pdfDoc.copyPages(pdfDoc1, [0, 1]);
      const [page3] = await pdfDoc.copyPages(pdfDoc2, [0]);

      // Update pdf content from html form fields
      for (var i = 0; i < selectionCfg['return_addr'].length; i++) {
        var line = selectionCfg['return_addr'][i];
        drawText(page3, coords.return_x, coords.return_y - i * 13, (i ? sansRegular : sansBold), line)
      }

      for (var i = 0; i < selectionCfg['sender_sign'].length; i++) {
        var line = selectionCfg['sender_sign'][i];
        drawText(page3, 71, 110 - i * 14, sansRegular, line)
      }

      const lastnameField = getFormField('lastname').value || "Lastname";
      const firstnameField = getFormField('firstname').value || "Firstname";
      const birthdayField = getFormField('birthday');
      const streetField = getFormField('street').value || "Streetname 123a";
      const plzField = getFormField('postleitzahl').value || "98765";

      const birthdayValue = (birthdayField.value || "1999.12.31").split("-").reverse().join(".")

      const personFieldValues = [lastnameField, firstnameField, birthdayValue, streetField, plzField]
      var y_coord = coords.person_y;
      for (var i = 0; i < personFieldValues.length; i++) {
        drawText(page1, coords.person_x, y_coord, serifBold, personFieldValues[i])
        y_coord -= coords.person_y_steps[i]
      }

      try {
        const cityNameField = getFormField('city-name');
        drawText(page3, 71, 690, sansBold, cityNameField.innerText)
        drawText(page3, 71, 674, sansBold, "Gemeindeverwaltung/Bürgeramt")
      } catch (err) { console.log(err) }

      try {
        const cityStreetField = getFormField('city-street');
        drawText(page3, 71, 658, sansRegular, cityStreetField.innerText)
      } catch (err) { console.log(err) }

      try {
        const cityPlzField = getFormField('city-plz');
        drawText(page3, 71, 642, sansRegular, cityPlzField.innerText)
      } catch (err) { console.log(err) }

      if (0) {
        drawDebugGrid(page1)
        drawDebugGrid(page2)
        drawDebugGrid(page3)
      }

      pdfDoc.addPage(page1)
      pdfDoc.addPage(page2)
      pdfDoc.addPage(page3)

      updateProgress("saving pdf");
      const pdfBytes = await pdfDoc.save()

      // Trigger the browser to download the PDF document
      updateProgress("downloading");
      await loadScript("lib/download.js")
      download(pdfBytes, `uu_formular_${selectionID}.pdf`, "application/pdf");

    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }

    return false;
  }

  const ROUTES = {
    "/index.html": initIndexPage,
    "/wahl.html": initWahlPage,
    "/partei.html": initParteiPage,
    "/formular.html": initFormularPage
  }

  function selectRoute(event) {
    ROUTES[window.location.pathname](event)
  }

  document.addEventListener("DOMContentLoaded", selectRoute);

  return {
    getConfigs: getConfigs,
    generatePDF: generatePDF,
  };

})();
