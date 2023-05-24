const puppeteer = require('puppeteer');
const fs = require('fs');

interface _Node {
  parent?: _Node,
  link: string,
  children: _Node[]
}

async function run() {
  const startTime = Date.now();
  
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  const target = "https://en.wikipedia.org/wiki/World_Trade_Center_(1973%E2%80%932001)"
  const start = "https://en.wikipedia.org/wiki/Polans_(western)"
  
  const root = {
    link: start,
    children: []
  }
  const visited: string[] = [];
  
  const queue: _Node[] = [];

  const GOTO_LIMIT = 30000;
  const DELAY = 30;

  async function goTo(node: _Node, counter: number): Promise<void> {

    await page.goto(node.link);
    
    const links: string[] = await page.$$eval("#mw-content-text a", (as: HTMLAnchorElement[], visited) => as.reduce((arr, curr) => {
      if (curr.href.includes("https://en.wikipedia.org/wiki/") && !curr.href.includes("/File:")) {
        let hashIndex = curr.href.indexOf('#');
        const pageLink = hashIndex > 0 ? curr.href.substring(0, hashIndex) : curr.href;
        if (!arr.includes(pageLink) && !visited.includes(pageLink)) {
          return [...arr, curr.href ];
        }
      }
      return arr;
    }, []), visited);

    if (links.includes(target)) { 
      console.log("FOUND!!!!")
      const path = [];
      let n = node;
      while (n != root) {
        path.unshift(n);
        n = n.parent;
      }
      path.unshift(n);
      for (let i = 0; i < path.length; i++) {
        console.log(`${i} ${path[i].link}`);
      }
      console.log(`${path.length} ${target}`);
      return;
    } 
    
    for (const link of links) {
      node.children.push({
        parent: node,
        link,
        children: []
      });
      visited.push(link);
      queue.push(node.children[node.children.length - 1]);
    }

    const nextNode = queue.shift();

    await page.waitForTimeout(DELAY);

    if (counter < GOTO_LIMIT)
      await goTo(nextNode, ++counter);
    else console.log("COUNTER EXCEEDED " + GOTO_LIMIT);
  }

  await goTo(root, 0);

  console.log("Time taken: " + (Date.now() - startTime) / 1000 + " s");
  
  browser.close();
}

run();