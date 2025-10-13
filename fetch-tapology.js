async function parseEventListFromURL(url) {
  // Fetch HTML (may be blocked by CORS when run in browser)
  const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${url}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  })
    .then((r) => r.text())
    .then((html) => parseEventListFromHTML(html, url))
    .catch((e) => {
      console.error(`Failed to fetch or parse ${url}:`, e);
      return [];
    });
  return res;
}

function parseEventListFromHTML(html, baseUrl = "") {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const list = tmp.querySelector('ul[data-event-view-toggle-target="list"]');
  if (!list) return [];

  const items = [];
  list.querySelectorAll("li").forEach((li) => {
    const boutWrapper = li.querySelector("[data-bout-wrapper]");
    const boutEntry = boutWrapper?.children[0];
    const fighter1 = boutEntry?.children[0]
      ?.querySelector(".link-primary-red")
      ?.textContent.trim();
    const rounds = boutEntry?.children[1]
      ?.querySelector(".div.text-xs11")
      ?.textContent.trim();
    const fighter2 = boutEntry?.children[2]
      ?.querySelector(".link-primary-red")
      ?.textContent.trim();
    // if either not present, skip
    if (!fighter1 || !fighter2) return;

    // produce tuple of three strings
    items.push({ fighter1, fighter2, fiveRounds: rounds === "5 x 5" });
  });

  return items;
}

function buildListRow(id = "fight-list-template") {
  const tpl = document.getElementById(id);
  const node = document.importNode(tpl.content, true);
  const tr = node.querySelector("tr");

  return tr;
}

const outputListTbody = document.getElementById("fight-list-output-tbody");

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
      tr.querySelector(".td1").textContent = fight.fighter1;
      tr.querySelector(".td2").textContent = fight.fighter2;
    } else {
      tr.querySelector(".vs").textContent = "";
    }
  }
  const mainEvents = fights.filter((f) => f?.fiveRounds);
  mainEvents.forEach((fight) => {
    const tr = buildListRow("fight-list-output-template");
    outputListTbody.appendChild(tr);
    tr.querySelector(".td1").textContent = fight.fighter1;
    tr.querySelector(".td2").textContent = fight.fighter2;
  });
};

async function loadFromTapology(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  })
    .then((r) => r.text())
    .then((html) => {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const a = tmp.querySelector(".fightcenterEvents a");
      const href = a
        ? new URL(a.getAttribute("href"), "https://www.tapology.com").href
        : null;
      parseEventListFromURL(href)
        .then((fights) => {
          renderFightList(fights);
        })
        .catch(console.error);
    })
    .catch(console.error);

  // if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
}

const loadTapologyBtn = document.getElementById("load-tapology-btn");
loadTapologyBtn?.addEventListener("click", () => {
  console.log("Loading from tapology...");
  loadFromTapology(
    `https://api.codetabs.com/v1/proxy?quest=https://www.tapology.com/fightcenter?group=ufc`
  );
});
