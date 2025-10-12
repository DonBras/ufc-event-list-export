/* App logic for UFC Betting Picks */
(function () {
  const tbody = document.getElementById("fights-tbody");
  const listTbody = document.getElementById("fight-list-tbody");
  const outputListTbody = document.getElementById("fight-list-output-tbody");
  const addBtn = document.getElementById("add-fight-btn");
  const exportBtn = document.getElementById("export-btn");
  const exportListBtn = document.getElementById("export-list-btn");
  const output = document.getElementById("output");
  const wikiInput = document.getElementById("wiki-url");
  const loadWikiBtn = document.getElementById("load-wiki-btn");

  // Paste the upcoming UFC event fights here. Each entry is [Fighter 1, Fighter 2].
  // Replace the sample with the next event's card when available.
  // Preloaded from Wikipedia Fight card:
  // https://en.wikipedia.org/wiki/UFC_on_ESPN:_Dolidze_vs._Hernandez
  const eventFights = [
    ["Roman Dolidze", "Anthony Hernandez"],
    ["Steve Erceg", "Ode' Osbourne"],
    ["Iasmin Lucindo", "Angela Hill"],
    ["Andre Fili", "Christian Rodriguez"],
    ["Miles Johns", "Jean Matsumoto"],
    ["Eryk Anders", "Christian Leroy Duncan"],
    ["Julius Walker", "Raffael Cerqueira"],
    ["Elijah Smith", "Toshiomi Kazama"],
    ["Joselyne Edwards", "Priscila Cachoeira"],
    ["Gabriella Fernandes", "Julija Stoliarenko"],
    ["Cody Brundage", "Eric McConico"],
  ];

  // Generate valid MMA decision totals including 10-8 and rare 10-7 rounds.
  // rounds can be 3 or 5; returns a Set of strings like "30-27", "49-46", etc.
  function generateValidDecisionScores(rounds) {
    const outcomes = [
      { a: 10, b: 9 }, // A wins 10-9
      { a: 10, b: 8 }, // A wins 10-8
      { a: 10, b: 7 }, // A wins 10-7 (rare)
      { a: 9, b: 10 }, // B wins 10-9
      { a: 8, b: 10 }, // B wins 10-8
      { a: 7, b: 10 }, // B wins 10-7 (rare)
      // If you want to allow 10-10 rounds, add: { a: 10, b: 10 }
    ];
    const set = new Set();
    function dfs(depth, a, b) {
      if (depth === rounds) {
        set.add(`${a}-${b}`);
        set.add(`${b}-${a}`);
        return;
      }
      for (const r of outcomes) {
        dfs(depth + 1, a + r.a, b + r.b);
      }
    }
    dfs(0, 0, 0);
    return set;
  }
  const validDecisionScores3 = generateValidDecisionScores(3);
  const validDecisionScores5 = generateValidDecisionScores(5);

  function renumberRows() {
    [...tbody.querySelectorAll("tr")].forEach((tr, i) => {
      const cell = tr.querySelector(".fight-num");
      if (cell) cell.textContent = String(i + 1);
    });
  }

  function setRoundOptions(tr) {
    const five = tr.querySelector(".five-rounds").checked;
    const roundSel = tr.querySelector(".round");
    const current = roundSel.value;
    roundSel.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Round";
    roundSel.appendChild(opt0);
    const max = five ? 5 : 3;
    for (let i = 1; i <= max; i++) {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = String(i);
      roundSel.appendChild(o);
    }
    if (current && Number(current) <= max) {
      roundSel.value = current;
    } else {
      roundSel.value = "";
    }
  }

  function onMethodChange(tr) {
    const method = tr.querySelector(".method").value;
    const roundSel = tr.querySelector(".round");
    const scoreInput = tr.querySelector(".score");

    if (method === "KO" || method === "SUB") {
      setRoundOptions(tr);
      roundSel.classList.remove("hidden");
      roundSel.required = true;
      scoreInput.classList.add("hidden");
      scoreInput.required = false;
      scoreInput.value = "";
    } else if (method === "DEC") {
      scoreInput.classList.remove("hidden");
      scoreInput.required = true;
      roundSel.classList.add("hidden");
      roundSel.required = false;
      roundSel.value = "";
    } else {
      // method not selected
      roundSel.classList.add("hidden");
      roundSel.required = false;
      roundSel.value = "";
      scoreInput.classList.add("hidden");
      scoreInput.required = false;
      scoreInput.value = "";
    }
  }

  function scoreFormatIsValid(val) {
    return /^\d{2}-\d{2}$/.test(val);
  }

  function scoreIsValid(val, fiveRounds) {
    // format must be NN-NN and in the generated valid set for 3 or 5-round fights
    if (!scoreFormatIsValid(val)) return false;
    return (fiveRounds ? validDecisionScores5 : validDecisionScores3).has(val);
  }

  function buildRow() {
    const tpl = document.getElementById("fight-row-template");
    const node = document.importNode(tpl.content, true);
    const tr = node.querySelector("tr");

    // Wire up events
    tr.querySelector(".method").addEventListener("change", () =>
      onMethodChange(tr)
    );
    tr.querySelector(".five-rounds").addEventListener("change", () => {
      // Adjust round select and placeholder for scores
      setRoundOptions(tr);
      const scoreInput = tr.querySelector(".score");
      if (tr.querySelector(".five-rounds").checked) {
        scoreInput.placeholder = "49-46";
      } else {
        scoreInput.placeholder = "29-28";
      }
    });
    tr.querySelector(".remove-btn").addEventListener("click", () => {
      tr.remove();
      renumberRows();
      toggleEmptyState();
    });

    return tr;
  }

  function buildListRow(id = "fight-list-template") {
    const tpl = document.getElementById(id);
    const node = document.importNode(tpl.content, true);
    const tr = node.querySelector("tr");

    return tr;
  }

  function ensureAtLeastOneRow() {
    if (!tbody.querySelector("tr")) {
      tbody.appendChild(buildRow());
      renumberRows();
    }
  }

  function toggleEmptyState() {
    if (!tbody.querySelector("tr")) {
      ensureAtLeastOneRow();
    }
  }

  function collectData() {
    const rows = [...tbody.querySelectorAll("tr")];
    const errors = [];

    const fights = rows.map((tr, idx) => {
      const f1 = tr.querySelector(".f1").value.trim();
      const f2 = tr.querySelector(".f2").value.trim();
      const pick = tr.querySelector(".pick").value;
      const method = tr.querySelector(".method").value;
      const round = tr.querySelector(".round").value;
      const score = tr.querySelector(".score").value.trim();
      const five = tr.querySelector(".five-rounds").checked;

      if (!f1) errors.push(`Fight ${idx + 1}: Fighter 1 is required`);
      if (!f2) errors.push(`Fight ${idx + 1}: Fighter 2 is required`);
      if (!pick) errors.push(`Fight ${idx + 1}: Pick is required`);
      if (!method) errors.push(`Fight ${idx + 1}: Method is required`);

      if (method === "KO" || method === "SUB") {
        if (!round)
          errors.push(`Fight ${idx + 1}: Round is required for ${method}`);
      } else if (method === "DEC") {
        if (!score) {
          errors.push(
            `Fight ${idx + 1}: Score is required for decision (e.g. ${
              five ? "49-46" : "29-28"
            })`
          );
        } else if (!scoreIsValid(score, five)) {
          errors.push(
            `Fight ${idx + 1}: Invalid MMA score. Use a valid ${
              five ? "5" : "3"
            }-round total (e.g. ${
              five ? "50-45, 49-46, 48-47" : "30-27, 29-28, 29-27"
            })`
          );
        }
      }

      return {
        fighters: { one: f1, two: f2 },
        pick: pick === "1" ? "one" : pick === "2" ? "two" : null,
        method: method || null,
        rounds: five ? 5 : 3,
        ...((method === "KO" || method === "SUB") && round
          ? { round: Number(round) }
          : {}),
        ...(method === "DEC" && score ? { score } : {}),
      };
    });

    return { fights, errors };
  }

  function collectListData() {
    const rows = [...listTbody.querySelectorAll("tr")];

    const fights = rows.map((tr) => {
      const f1 = tr.querySelector(".f1").textContent.trim();
      const f2 = tr.querySelector(".f2").textContent.trim();
      const five = tr.querySelector(".five-rounds").checked;

      return {
        fighters: { one: f1, two: f2 },
        fiveRounds: five,
      };
    });

    return fights;
  }

  function preloadFightsFromEvent(list) {
    const fights = Array.isArray(list) && list.length ? list : [];
    if (!Array.isArray(fights) || !fights.length) return;
    // Clear existing rows
    tbody.innerHTML = "";
    const original = [...fights];
    const reversed = [...fights].reverse();
    const mainEvent = original[0];
    reversed.forEach(([f1, f2]) => {
      const tr = buildRow();
      tbody.appendChild(tr);
      tr.querySelector(".f1").value = f1;
      tr.querySelector(".f2").value = f2;
      // Keep the original main event as 5 rounds even after reversing
      if (mainEvent && f1 === mainEvent[0] && f2 === mainEvent[1]) {
        const chk = tr.querySelector(".five-rounds");
        chk.checked = true;
        setRoundOptions(tr);
      }
    });
    renumberRows();
  }

  function preloadFightListFromEvent(list) {
    console.log(list);
    const fights = Array.isArray(list) && list.length ? list : [];
    if (!Array.isArray(fights) || !fights.length) return;
    // Clear existing rows
    listTbody.innerHTML = "";
    const original = [...fights];
    const reversed = [...fights].reverse();
    const mainEvent = original[0];
    reversed.forEach(([f1, f2]) => {
      const tr = buildListRow();
      listTbody.appendChild(tr);
      tr.querySelector(".f1").textContent = f1;
      tr.querySelector(".f2").textContent = f2;
      // Keep the original main event as 5 rounds even after reversing
      if (mainEvent && f1 === mainEvent[0] && f2 === mainEvent[1]) {
        const chk = tr.querySelector(".five-rounds");
        chk.checked = true;
        setRoundOptions(tr);
      }
    });
    // renumberRows();
  }

  // addBtn.addEventListener("click", () => {
  //   tbody.appendChild(buildRow());
  //   renumberRows();
  // });

  // exportBtn.addEventListener("click", () => {
  //   const { fights, errors } = collectData();
  //   if (errors.length) {
  //     output.value = `Fix the following issues:\n- ${errors.join("\n- ")}`;
  //     return;
  //   }
  //   output.value = JSON.stringify({ fights }, null, 2);
  // });

  const renderFightList = (list) => {
    const fights = Array.isArray(list) && list.length ? list : [];
    if (!Array.isArray(fights) || !fights.length) return;
    // Clear existing rows
    outputListTbody.innerHTML = "";
    for (let i = 0; i < 15; i++) {
      const fight = fights?.[i];
      const tr = buildListRow("fight-list-output-template");
      outputListTbody.appendChild(tr);
      if (fight && !fight?.fiveRounds) {
        tr.querySelector(".td1").textContent = fight.fighters.one;
        tr.querySelector(".td2").textContent = fight.fighters.two;
      } else {
        tr.querySelector(".vs").textContent = "";
      }
    }
    const mainEvents = fights.filter((f) => f?.fiveRounds);
    mainEvents.forEach((fight) => {
      const tr = buildListRow("fight-list-output-template");
      outputListTbody.appendChild(tr);
      tr.querySelector(".td1").textContent = fight.fighters.one;
      tr.querySelector(".td2").textContent = fight.fighters.two;
    });
  };

  exportListBtn.addEventListener("click", () => {
    const fights = collectListData();
    renderFightList(fights);
    // output.value = JSON.stringify({ fights }, null, 2);
  });

  async function loadFromWikipedia(url) {
    try {
      // Extract page title from /wiki/Title portion
      const m = url.match(/\/wiki\/([^#?]+)/);
      if (!m) throw new Error("Invalid Wikipedia URL");
      const title = decodeURIComponent(m[1]);
      // 1) fetch sections to find "Fight card"
      const secRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=parse&format=json&origin=*&page=${encodeURIComponent(
          title
        )}&prop=sections`
      );
      const secJson = await secRes.json();
      const sections = (secJson.parse && secJson.parse.sections) || [];
      const fightCard = sections.find(
        (s) => (s.line || "").toLowerCase() === "fight card"
      );
      if (!fightCard) throw new Error("Fight card section not found");
      // 2) fetch HTML for that section
      const htmlRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=parse&format=json&origin=*&page=${encodeURIComponent(
          title
        )}&prop=text&section=${fightCard.index}`
      );
      const htmlJson = await htmlRes.json();
      const html =
        htmlJson.parse && htmlJson.parse.text && htmlJson.parse.text["*"];
      if (!html) throw new Error("Unable to fetch fight card HTML");
      // 3) parse tables for fighter pairs
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const pairs = [];
      const seen = new Set();
      const tables = tmp.querySelectorAll("table");
      tables.forEach((table) => {
        table.querySelectorAll("tbody tr").forEach((tr, index) => {
          // Skip header rows
          if (tr.querySelector("th")) return;
          const cells = Array.from(tr.querySelectorAll("td")).filter(
            (val, idx) => [1, 3].includes(idx)
          );
          const names = cells.map((a) => a.textContent.trim()).filter(Boolean);
          if (names.length >= 2) {
            const a = names[0];
            const b = names[1];
            const key = `${a}__${b}`;
            if (!seen.has(key)) {
              seen.add(key);
              pairs.push([a, b]);
            }
          }
        });
      });
      // Fallback to regex on plain text if table parsing yields nothing
      if (!pairs.length) {
        const text = tmp.textContent
          .replace(/\[[0-9]+\]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const name =
          "[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'`\\.-]+(?: [A-Z][A-Za-zÀ-ÖØ-öø-ÿ'`\\.-]+)+";
        const re = new RegExp(`(${name})\\s+vs\\.\\s+(${name})`, "g");
        let m2;
        const bad = [
          "Weight",
          "weight",
          "Main card",
          "Preliminary",
          "Method",
          "Round",
          "Time",
          "Notes",
          "Ultimate Championship",
          "Retrieved",
        ];
        while ((m2 = re.exec(text)) !== null) {
          const a = m2[1].trim();
          const b = m2[2].trim();
          if (bad.some((s) => a.includes(s) || b.includes(s))) continue;
          if (a.split(" ").length < 2 || b.split(" ").length < 2) continue;
          const key = `${a}__${b}`;
          if (!seen.has(key)) {
            seen.add(key);
            pairs.push([a, b]);
          }
        }
      }
      if (!pairs.length) throw new Error("No fights found in Fight card");
      preloadFightListFromEvent(pairs);
      output.value = `Loaded ${pairs.length} fights from Wikipedia.`;
    } catch (e) {
      output.value = `Failed to load: ${e.message}`;
    }
  }

  async function getLastScheduledEventLinkBrowser() {
    const API =
      "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_UFC_events&prop=text&format=json&origin=*";
    const res = await fetch(API);
    const j = await res.json();
    const html = j.parse && j.parse.text && j.parse.text["*"];
    if (!html) return null;
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const table = tmp.querySelector("table#Scheduled_events");
    console.log(table);
    if (!table) return null;
    const rows = table.querySelectorAll("tbody tr");
    if (!rows.length) return null;
    const last = rows[rows.length - 1];
    const a = last.querySelector("a[href]");
    if (!a) return null;
    return new URL(a.getAttribute("href"), "https://en.wikipedia.org").href;
  }

  loadWikiBtn?.addEventListener("click", async () => {
    const url = await getLastScheduledEventLinkBrowser();
    if (!url) {
      output.value = "Please paste a Wikipedia event URL to load.";
      return;
    }
    loadFromWikipedia(url);
  });

  // Initialize with event preload if available; otherwise ensure one row.
  if (eventFights && eventFights.length) {
    preloadFightsFromEvent();
  } else {
    ensureAtLeastOneRow();
  }
})();
