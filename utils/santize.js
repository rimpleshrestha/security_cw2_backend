const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

// Set up DOMPurify for Node
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

// sanitize function
function sanitizeInput(input) {
  if (typeof input === "string") {
    return DOMPurify.sanitize(input);
  }
  return input;
}

module.exports = { sanitizeInput };
