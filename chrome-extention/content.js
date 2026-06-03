// Funktion til at hente data fra din MCP-server
async function fetchMCPData(prompt) {
  try {
    const response = await fetch('https://easydata.is', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: "resources/read", // Standard MCP-metode til datalevering
        params: { uri: `easydata://query?q=${encodeURIComponent(prompt)}` }
      })
    });
    
    const data = await response.json();
    return data.result?.contents?.[0]?.text || "Ingen data fundet.";
  } catch (error) {
    console.error("MCP fejl:", error);
    return "Fejl ved hentning af MCP data.";
  }
}

// Funktion til at finde Gemini's inputfelt og indsætte tekst
function insertTextIntoGemini(text) {
  // Søger efter Geminis tekstfelt baseret på gængse klasser/attributter
  const inputBox = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
  
  if (inputBox) {
    inputBox.focus();
    // Bruger execCommand for at sikre, at browseren registrerer ændringen
    document.execCommand('insertText', false, text);
  }
}

// Hold øje med hvad brugeren taster i inputfeltet
document.addEventListener('keydown', async (event) => {
  // Aktiveres når du trykker Ctrl + M (Genvej til MCP)
  if (event.ctrlKey && event.key.toLowerCase() === 'm') {
    const inputBox = event.target;
    const currentQuery = inputBox.innerText || inputBox.value;

    if (!currentQuery) return;

    // Vis visuel status i feltet mens der hentes data
    insertTextIntoGemini("\n[Henter data fra MCP...]");

    const mcpContext = await fetchMCPData(currentQuery);
    
    // Fjern statusbesked og indsæt det rigtige kontekst-data
    insertTextIntoGemini(`\n\n[MCP Kontekst]:\n${mcpContext}\n`);
  }
});
