// Test setup file for JSDOM
import { JSDOM } from "jsdom";
import mithril from "mithril";

// Create a JSDOM instance
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true
});

// Set up global variables that Mithril expects
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;

// Load Mithril into the global scope
global.m = mithril;

// Cleanup after tests complete
process.on("beforeExit", () => {
  dom.window.close();
});
