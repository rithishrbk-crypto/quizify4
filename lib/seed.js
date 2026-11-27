// Sample quizzes written to data/quizzes.json the first time the server runs.
const q = (text, options, correctIndex, explanation) => ({ text, options, correctIndex, explanation });
const build = (meta, qs) => ({ ...meta, questions: qs.map((x, i) => ({ id: `q${i + 1}`, marks: 1, ...x })) });

module.exports = () => [
  build({
    id: 'html-fundamentals', title: 'HTML Fundamentals', category: 'Web Development', difficulty: 'Beginner', durationMinutes: 10,
    description: 'Tags, attributes and document structure: the building blocks of every web page.',
  }, [
    q(`What does HTML stand for?`, [`Hyper Text Markup Language`, `High Tech Modern Language`, `Hyperlinks and Text Management Language`, `Home Tool Markup Language`], 0, `HTML stands for Hyper Text Markup Language, the standard language for structuring web pages.`),
    q(`Which tag creates the largest heading?`, [`<h6>`, `<head>`, `<h1>`, `<heading>`], 2, `<h1> is the top-level heading and renders largest by default. <h6> is the smallest.`),
    q(`Which attribute provides alternative text for an image?`, [`title`, `src`, `href`, `alt`], 3, `The alt attribute describes the image for screen readers and is shown if the image fails to load.`),
    q(`Which element creates an unordered (bulleted) list?`, [`<ol>`, `<ul>`, `<li>`, `<dl>`], 1, `<ul> creates a bulleted list. Each item inside it is wrapped in <li>.`),
    q(`Which tag defines a hyperlink?`, [`<link>`, `<href>`, `<a>`, `<url>`], 2, `The anchor element <a> creates a hyperlink. Its destination is set with the href attribute.`),
    q(`Which declaration identifies a document as HTML5?`, [`<!DOCTYPE html>`, `<html version="5">`, `<!HTML5>`, `<doctype html5>`], 0, `<!DOCTYPE html> at the top of the file tells the browser to use standards mode for HTML5.`),
    q(`Which of these is a semantic element?`, [`<div>`, `<span>`, `<b>`, `<article>`], 3, `<article> describes the meaning of its content. <div> and <span> carry no meaning on their own.`),
    q(`Which attribute opens a link in a new browser tab?`, [`target="_blank"`, `rel="new"`, `href="_new"`, `open="tab"`], 0, `target="_blank" opens the link in a new tab. Adding rel="noopener" is recommended for safety.`),
    q(`Which input type gives built-in email format validation?`, [`text`, `mail`, `email`, `address`], 2, `type="email" makes the browser check that the value looks like an email address.`),
    q(`Where does the visible page content belong?`, [`<head>`, `<meta>`, `<title>`, `<body>`], 3, `<body> holds everything displayed on the page. <head> holds metadata such as the title.`),
  ]),
  build({
    id: 'css-fundamentals', title: 'CSS Fundamentals', category: 'Web Development', difficulty: 'Beginner', durationMinutes: 10,
    description: 'Selectors, the box model, Flexbox and responsive basics for styling the web.',
  }, [
    q(`What does CSS stand for?`, [`Creative Style Sheets`, `Cascading Style Sheets`, `Computer Style Sheets`, `Colorful Style Sheets`], 1, `CSS stands for Cascading Style Sheets. "Cascading" refers to how competing rules are resolved.`),
    q(`Which selector targets an element with the id "main"?`, [`.main`, `main`, `#main`, `*main`], 2, `# selects by id, while . selects by class and a bare name selects by tag.`),
    q(`Which property changes the color of text?`, [`font-color`, `text-color`, `foreground`, `color`], 3, `The color property sets the foreground (text) color.`),
    q(`From the inside out, what is the order of the CSS box model?`, [`Content, padding, border, margin`, `Content, margin, border, padding`, `Padding, content, border, margin`, `Margin, border, padding, content`], 0, `Content sits in the middle, wrapped by padding, then the border, then the margin.`),
    q(`What is display: flex mainly used for?`, [`Hiding an element`, `Creating a flexible one-dimensional layout`, `Loading custom fonts`, `Animating colors`], 1, `Flexbox lays items out in a row or column and distributes the space between them.`),
    q(`Which unit is relative to the root element's font size?`, [`px`, `em`, `rem`, `pt`], 2, `rem is relative to the root (html) font size. em is relative to the current element's font size.`),
    q(`Which property controls the stacking order of overlapping elements?`, [`z-index`, `order`, `stack`, `layer`], 0, `Elements with a higher z-index are painted on top, for positioned elements.`),
    q(`Which pseudo-class applies while the mouse is over an element?`, [`:active`, `:focus`, `:visited`, `:hover`], 3, `:hover matches an element while the pointer is over it.`),
    q(`An element with position: absolute is placed relative to what?`, [`The browser viewport, always`, `Its nearest positioned ancestor`, `Its previous sibling`, `The document title`], 1, `It uses the nearest ancestor whose position is not static, falling back to the initial containing block.`),
    q(`Which media query applies styles on screens up to 600px wide?`, [`@media (min-width: 600px)`, `@screen (max: 600px)`, `@media (max-width: 600px)`, `@media (width > 600px)`], 2, `@media (max-width: 600px) matches viewports 600px wide or narrower.`),
  ]),
  build({
    id: 'javascript-basics', title: 'JavaScript Basics', category: 'Programming', difficulty: 'Intermediate', durationMinutes: 12,
    description: 'Variables, types, arrays, promises and the DOM: core JavaScript you use every day.',
  }, [
    q(`Which keyword declares a block-scoped variable that can be reassigned?`, [`var`, `let`, `const`, `static`], 1, `let is block-scoped and reassignable. const is block-scoped but cannot be reassigned.`),
    q(`What does typeof null return?`, [`"null"`, `"undefined"`, `"number"`, `"object"`], 3, `typeof null returns "object". This is a long-standing quirk of the language.`),
    q(`Which array method adds an item to the end?`, [`pop()`, `shift()`, `push()`, `unshift()`], 2, `push() appends to the end. pop() removes the last item, and unshift() adds to the front.`),
    q(`What is the result of "5" + 3?`, [`8`, `"53"`, `NaN`, `TypeError`], 1, `With a string operand, + concatenates, so the number 3 becomes "3" and the result is "53".`),
    q(`How does === differ from ==?`, [`It checks type as well as value`, `It is only used for strings`, `It assigns a value`, `It compares object contents deeply`], 0, `=== is strict equality with no type coercion, so 5 === "5" is false.`),
    q(`Which method turns a JSON string into a JavaScript object?`, [`JSON.stringify()`, `JSON.parse()`, `JSON.object()`, `JSON.decode()`], 1, `JSON.parse() converts text to a value. JSON.stringify() does the reverse.`),
    q(`What does Array.prototype.map() return?`, [`A new array with each result`, `The original array, modified`, `A single accumulated value`, `undefined`], 0, `map() calls a function on every item and returns a new array of the results without changing the original.`),
    q(`Which value is falsy?`, [`"0"`, `[]`, `{}`, `0`], 3, `The number 0 is falsy. The string "0", empty arrays and empty objects are all truthy.`),
    q(`What does an async function always return?`, [`The awaited value directly`, `undefined`, `A Promise`, `A callback`], 2, `An async function always returns a Promise that resolves with the function's return value.`),
    q(`Which call selects an element by its id?`, [`document.getElementById()`, `document.queryId()`, `window.findId()`, `document.selectId()`], 0, `document.getElementById("x") returns the element with that id, or null if none exists.`),
  ]),
  build({
    id: 'programming-fundamentals', title: 'Programming Fundamentals', category: 'Computer Science', difficulty: 'Beginner', durationMinutes: 12,
    description: 'Algorithms, data structures and core concepts every programmer should know.',
  }, [
    q(`What is an algorithm?`, [`A step-by-step procedure for solving a problem`, `A type of programming language`, `A hardware component`, `A kind of compiler`], 0, `An algorithm is a finite sequence of well-defined steps that solves a problem.`),
    q(`Which data structure follows last in, first out (LIFO)?`, [`Queue`, `Array`, `Stack`, `Graph`], 2, `In a stack the most recently added item is removed first, like a pile of plates.`),
    q(`What is the time complexity of binary search on a sorted array?`, [`O(n)`, `O(log n)`, `O(n²)`, `O(1)`], 1, `Binary search halves the remaining range each step, giving O(log n).`),
    q(`What is a loop that never terminates called?`, [`A nested loop`, `A recursive loop`, `A conditional loop`, `An infinite loop`], 3, `An infinite loop has an exit condition that is never met, so it keeps running.`),
    q(`What does a compiler do?`, [`Translates source code into machine code`, `Runs code one line at a time only`, `Formats source code`, `Stores variables on disk`], 0, `A compiler translates a program written in a high-level language into machine code or bytecode.`),
    q(`Which data type holds only true or false?`, [`Integer`, `String`, `Boolean`, `Float`], 2, `A Boolean can only be true or false, and is used for conditions and flags.`),
    q(`What is recursion?`, [`A loop with a counter`, `A function that calls itself`, `Running code in parallel`, `Converting between types`], 1, `Recursion solves a problem by having a function call itself on smaller inputs until a base case is reached.`),
    q(`Which OOP principle bundles data with the methods that act on it and hides internal details?`, [`Inheritance`, `Polymorphism`, `Encapsulation`, `Iteration`], 2, `Encapsulation keeps data and behaviour together and limits direct access to internal state.`),
    q(`Which statement runs code only when a condition is true?`, [`for`, `if`, `break`, `return`], 1, `An if statement runs its block only when the condition evaluates to true.`),
    q(`What is the main purpose of version control such as Git?`, [`Tracking changes and collaborating on code`, `Compiling code faster`, `Designing user interfaces`, `Hosting databases`], 0, `Version control records the history of changes and lets teams work on the same code safely.`),
  ]),
  build({
    id: 'general-knowledge', title: 'General Knowledge', category: 'General', difficulty: 'Beginner', durationMinutes: 8,
    description: 'A mixed round of geography, science, history and literature.',
  }, [
    q(`What is the capital of Australia?`, [`Sydney`, `Melbourne`, `Canberra`, `Perth`], 2, `Canberra is the capital. Sydney and Melbourne are larger but are not the seat of government.`),
    q(`Which planet is known as the Red Planet?`, [`Venus`, `Mars`, `Jupiter`, `Mercury`], 1, `Mars looks red because of iron oxide (rust) on its surface.`),
    q(`Who wrote Romeo and Juliet?`, [`Charles Dickens`, `Jane Austen`, `Mark Twain`, `William Shakespeare`], 3, `Romeo and Juliet is a tragedy written by William Shakespeare in the 1590s.`),
    q(`Which is the largest ocean on Earth?`, [`Atlantic`, `Indian`, `Pacific`, `Arctic`], 2, `The Pacific Ocean covers about a third of the planet's surface.`),
    q(`What is the chemical symbol for gold?`, [`Au`, `Ag`, `Gd`, `Go`], 0, `Au comes from the Latin word "aurum". Ag is silver.`),
    q(`Which gas do plants absorb for photosynthesis?`, [`Oxygen`, `Carbon dioxide`, `Nitrogen`, `Hydrogen`], 1, `Plants take in carbon dioxide and, using sunlight, convert it to sugars and release oxygen.`),
    q(`In which year did India gain independence?`, [`1942`, `1950`, `1935`, `1947`], 3, `India became independent from British rule on 15 August 1947.`),
    q(`What is the hardest naturally occurring substance?`, [`Quartz`, `Diamond`, `Steel`, `Granite`], 1, `Diamond, a crystalline form of carbon, is the hardest natural material.`),
    q(`Which is the largest mammal?`, [`African elephant`, `Giraffe`, `Blue whale`, `Polar bear`], 2, `The blue whale is the largest animal known to have ever lived.`),
    q(`Who is known as the Father of the Nation in India?`, [`Jawaharlal Nehru`, `Mahatma Gandhi`, `Subhas Chandra Bose`, `Sardar Patel`], 1, `Mahatma Gandhi is honoured as the Father of the Nation for leading India's non-violent independence movement.`),
  ]),
];
