/**
 * Code Exporter for Cake Web Builder
 * Compiles the CWB-JSON tree structure and class stylesheet rules
 * into a single, clean, self-contained HTML/CSS production file.
 */

export class Exporter {
  static exportCode(docState) {
    const JSZip = window.JSZip;
    if (!JSZip) {
      console.warn("JSZip is not loaded. Exporting as single self-contained HTML file.");
      this.exportSingleFileFallback(docState);
      return;
    }

    const { classes, tree, globals } = docState;

    // Deep clone tree and classes to avoid modifying the application's active state
    const clonedTree = JSON.parse(JSON.stringify(tree));
    const clonedClasses = JSON.parse(JSON.stringify(classes));

    const imageAssets = [];
    let imgCounter = 0;

    // Helper to extract base64 data and return relative path
    const replaceCssUrls = (val) => {
      if (typeof val !== 'string') return val;
      if (!val.includes('data:image/')) return val;
      
      return val.replace(/url\(['"]?(data:image\/[^'")\s]+)['"]?\)/gi, (match, dataUrl) => {
        const commaIdx = dataUrl.indexOf(',');
        if (commaIdx === -1) return match;
        const header = dataUrl.substring(0, commaIdx);
        const base64Data = dataUrl.substring(commaIdx + 1);
        
        const mimeMatch = header.match(/data:(image\/[^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        
        let ext = 'png';
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
        else if (mimeType.includes('gif')) ext = 'gif';
        else if (mimeType.includes('svg')) ext = 'svg';
        else if (mimeType.includes('webp')) ext = 'webp';
        
        imgCounter++;
        const filename = `img_${imgCounter}.${ext}`;
        
        imageAssets.push({
          filename: filename,
          base64Data: base64Data,
          mimeType: mimeType
        });
        
        // Inside compiled CSS file (assets/css/styles.css), images are located at ../images/filename
        return `url("../images/${filename}")`;
      });
    };

    const replaceImgSrc = (srcVal) => {
      if (typeof srcVal !== 'string') return srcVal;
      if (!srcVal.startsWith('data:image/')) return srcVal;
      
      const commaIdx = srcVal.indexOf(',');
      if (commaIdx === -1) return srcVal;
      const header = srcVal.substring(0, commaIdx);
      const base64Data = srcVal.substring(commaIdx + 1);
      
      const mimeMatch = header.match(/data:(image\/[^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      
      let ext = 'png';
      if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
      else if (mimeType.includes('gif')) ext = 'gif';
      else if (mimeType.includes('svg')) ext = 'svg';
      else if (mimeType.includes('webp')) ext = 'webp';
      
      imgCounter++;
      const filename = `img_${imgCounter}.${ext}`;
      
      imageAssets.push({
        filename: filename,
        base64Data: base64Data,
        mimeType: mimeType
      });
      
      // Inside index.html, images are located at ./assets/images/filename
      return `./assets/images/${filename}`;
    };

    const processStylesObj = (stylesObj) => {
      if (!stylesObj) return;
      Object.values(stylesObj).forEach(bpStyles => {
        if (!bpStyles) return;
        Object.entries(bpStyles).forEach(([key, val]) => {
          if (typeof val === 'string' && val.includes('data:image/')) {
            bpStyles[key] = replaceCssUrls(val);
          }
        });
      });
    };

    const processNodeObj = (node) => {
      if (node.styles) {
        processStylesObj(node.styles);
      }
      if (node.attributes && node.attributes.src) {
        node.attributes.src = replaceImgSrc(node.attributes.src);
      }
      if (node.children) {
        node.children.forEach(processNodeObj);
      }
    };

    // Scan cloned state structures
    processNodeObj(clonedTree);
    Object.values(clonedClasses).forEach(processStylesObj);

    // 1. Process and compile the HTML structure recursively using replaced tree/classes
    const compiledHtml = this.compileNodeToHtml(clonedTree, clonedClasses, docState.dynamicData);

    // 2. Process and compile the clean CSS rules using replaced classes/tree
    const compiledCssRaw = this.compileStylesToCss(clonedClasses, clonedTree, globals);
    const cssBracesRegex = /\{\{([^}]+)\}\}/g;
    const compiledCss = compiledCssRaw.replace(cssBracesRegex, (match, path) => {
      const resolved = this.resolvePath(docState.dynamicData, path.trim());
      return resolved !== undefined && resolved !== null ? resolved : match;
    });

    // Find used Google Fonts and compile dynamic import links
    const usedFonts = this.getUsedFonts(clonedTree, clonedClasses);
    let googleFontsBlock = '';
    if (usedFonts.size > 0) {
      const fontQuery = Array.from(usedFonts).map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;900`).join('&');
      googleFontsBlock = `
  <!-- Google Fonts Dynamic Load -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?${fontQuery}&display=swap" rel="stylesheet">`;
    } else {
      // Default lightweight fallbacks if no custom fonts are declared
      googleFontsBlock = `
  <!-- Google Fonts import standard -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`;
    }

    // 3. Assemble HTML scaffolding referencing the external stylesheet
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Cake Web Page</title>${googleFontsBlock}
  <link rel="stylesheet" href="./assets/css/styles.css">
</head>
<body>
${compiledHtml.split('\n').map(line => '  ' + line).join('\n')}
</body>
</html>`;

    // 4. Assemble full CSS stylesheet code
    const fullCss = `/* CSS Resets & Base Styles */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  min-height: 100vh;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
}
input, textarea, button, select {
  font: inherit;
}


/* Compiled Stylesheet */
${compiledCss}`;

    // 5. Build ZIP file using JSZip
    const zip = new JSZip();
    zip.file("index.html", fullHtml);
    zip.file("assets/css/styles.css", fullCss);

    imageAssets.forEach(img => {
      zip.file(`assets/images/${img.filename}`, img.base64Data, { base64: true });
    });

    zip.generateAsync({ type: "blob" }).then((content) => {
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.href = URL.createObjectURL(content);
      link.setAttribute('download', `cake-project-${timestamp}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }).catch(err => {
      console.error("Error generating zip, downloading single file HTML fallback instead:", err);
      this.exportSingleFileFallback(docState);
    });
  }

  static exportSingleFileFallback(docState) {
    const { classes, tree, globals } = docState;
    const compiledHtml = this.compileNodeToHtml(tree, classes, docState.dynamicData);
    const compiledCssRaw = this.compileStylesToCss(classes, tree, globals);
    const cssBracesRegex = /\{\{([^}]+)\}\}/g;
    const compiledCss = compiledCssRaw.replace(cssBracesRegex, (match, path) => {
      const resolved = this.resolvePath(docState.dynamicData, path.trim());
      return resolved !== undefined && resolved !== null ? resolved : match;
    });
    const usedFonts = this.getUsedFonts(tree, classes);
    let googleFontsBlock = '';
    if (usedFonts.size > 0) {
      const fontQuery = Array.from(usedFonts).map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;900`).join('&');
      googleFontsBlock = `
  <!-- Google Fonts Dynamic Load -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?${fontQuery}&display=swap" rel="stylesheet">`;
    } else {
      googleFontsBlock = `
  <!-- Google Fonts import standard -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`;
    }

    const fullSourceCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Cake Web Page</title>${googleFontsBlock}
  
  <style>
    /* CSS Resets & Base Styles */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      min-height: 100vh;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
    }
    input, textarea, button, select {
      font: inherit;
    }

    
    /* Compiled Stylesheet */
${compiledCss.split('\n').map(line => '    ' + line).join('\n')}
  </style>
</head>
<body>
${compiledHtml.split('\n').map(line => '  ' + line).join('\n')}
</body>
</html>`;

    const blob = new Blob([fullSourceCode], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `cake-page-${timestamp}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Compile JSON Node hierarchy recursively to production HTML tag blocks
  static compileNodeToHtml(node, classes, dynamicData = {}) {
    if (node.id === 'root') {
      // Root is body, we only process its children
      if (node.children) {
        return node.children.map(child => {
          if (child.loopSource) {
            const arr = this.resolvePath(dynamicData, child.loopSource);
            if (Array.isArray(arr) && arr.length > 0) {
              return arr.map((item, index) => {
                const childClone = JSON.parse(JSON.stringify(child));
                delete childClone.loopSource;
                this.rewriteBindings(childClone, child.loopSource, index);
                return this.compileNodeToHtml(childClone, classes, dynamicData);
              }).join('\n');
            }
          }
          return this.compileNodeToHtml(child, classes, dynamicData);
        }).join('\n');
      }
      return '';
    }

    const tag = node.tag;
    let attrStr = '';
    const classList = [...(node.classes || [])];

    // If node has direct style overrides or animations, append a unique styling class to it
    if (this.hasStyles(node) || (node.animations && node.animations.length > 0)) {
      classList.push(`cwb-${node.id}`);
    }

    // Class list output
    if (classList.length > 0) {
      attrStr += ` class="${classList.join(' ')}"`;
    }

    const attributes = { ...(node.attributes || {}) };
    let textContent = node.textContent || '';

    // Resolve double curly braces in text content
    const bracesRegex = /\{\{([^}]+)\}\}/g;
    textContent = textContent.replace(bracesRegex, (match, path) => {
      const resolved = this.resolvePath(dynamicData, path.trim());
      return resolved !== undefined && resolved !== null ? resolved : match;
    });

    // Resolve bindings for attributes
    if (node.bindings) {
      Object.entries(node.bindings).forEach(([field, path]) => {
        const resolvedValue = this.resolvePath(dynamicData, path);
        if (resolvedValue !== undefined && resolvedValue !== null) {
          if (field === 'textContent') {
            if (node.tag !== 'input' && node.tag !== 'textarea') {
              textContent = resolvedValue;
            }
          } else if (field.startsWith('attributes.')) {
            const attrName = field.substring('attributes.'.length);
            attributes[attrName] = resolvedValue;
          }
        }
      });
    }

    // Attributes list
    Object.entries(attributes).forEach(([key, val]) => {
      attrStr += ` ${key}="${val}"`;
    });

    // Element rendering
    let childrenHtml = '';
    if (node.children && node.children.length > 0) {
      childrenHtml = node.children.map(child => {
        if (child.loopSource) {
          const arr = this.resolvePath(dynamicData, child.loopSource);
          if (Array.isArray(arr) && arr.length > 0) {
            return arr.map((item, index) => {
              const childClone = JSON.parse(JSON.stringify(child));
              delete childClone.loopSource;
              this.rewriteBindings(childClone, child.loopSource, index);
              return this.compileNodeToHtml(childClone, classes, dynamicData);
            }).join('\n');
          }
        }
        return this.compileNodeToHtml(child, classes, dynamicData);
      }).join('\n');
    }

    // Void elements checking
    const voidTags = ['img', 'input', 'br', 'hr', 'meta', 'link'];
    if (voidTags.includes(tag)) {
      return `<${tag}${attrStr}>`;
    }

    if (childrenHtml) {
      return `<${tag}${attrStr}>\n${childrenHtml.split('\n').map(line => '  ' + line).join('\n')}\n</${tag}>`;
    } else {
      return `<${tag}${attrStr}>${textContent}</${tag}>`;
    }
  }

  static resolvePath(obj, path) {
    if (!path || !obj) return undefined;
    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
    const keys = normalizedPath.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
  }

  static rewritePath(path, loopSource, index) {
    if (!path || !loopSource) return path;
    const escapedSource = loopSource.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const indexRegex = new RegExp(`^${escapedSource}\\[\\d+\\]`);
    if (indexRegex.test(path)) {
      return path.replace(indexRegex, `${loopSource}[${index}]`);
    }
    const dotRegex = new RegExp(`^${escapedSource}\\.`);
    if (dotRegex.test(path)) {
      return path.replace(dotRegex, `${loopSource}[${index}].`);
    }
    if (path === loopSource) {
      return `${loopSource}[${index}]`;
    }
    return path;
  }

  static rewriteTextTemplate(text, loopSource, index) {
    if (typeof text !== 'string') return text;
    const bracesRegex = /\{\{([^}]+)\}\}/g;
    return text.replace(bracesRegex, (match, path) => {
      return `{{${this.rewritePath(path.trim(), loopSource, index)}}}`;
    });
  }

  static rewriteBindings(n, loopSource, index) {
    if (!n) return;

    if (n.textContent) {
      n.textContent = this.rewriteTextTemplate(n.textContent, loopSource, index);
    }

    if (n.bindings) {
      Object.keys(n.bindings).forEach(field => {
        n.bindings[field] = this.rewritePath(n.bindings[field], loopSource, index);
      });
    }

    if (n.styles) {
      Object.keys(n.styles).forEach(breakpoint => {
        const bpStyles = n.styles[breakpoint];
        if (bpStyles) {
          Object.keys(bpStyles).forEach(prop => {
            if (typeof bpStyles[prop] === 'string') {
              bpStyles[prop] = this.rewriteTextTemplate(bpStyles[prop], loopSource, index);
            }
          });
        }
      });
    }

    if (n.attributes) {
      Object.keys(n.attributes).forEach(attrName => {
        if (typeof n.attributes[attrName] === 'string') {
          n.attributes[attrName] = this.rewriteTextTemplate(n.attributes[attrName], loopSource, index);
        }
      });
    }

    if (n.children) {
      n.children.forEach(child => this.rewriteBindings(child, loopSource, index));
    }
  }

  // Check if a node contains inline overrides on any breakpoint
  static hasStyles(node) {
    if (!node.styles) return false;
    return (
      (node.styles.desktop && Object.keys(node.styles.desktop).length > 0) ||
      (node.styles.tablet && Object.keys(node.styles.tablet).length > 0) ||
      (node.styles.mobile && Object.keys(node.styles.mobile).length > 0)
    );
  }

  // Compile full CWB-JSON Stylesheet to static production-ready CSS blocks
  static compileStylesToCss(classes, tree, globals) {
    let desktopStyles = '';
    let tabletStyles = '';
    let mobileStyles = '';

    // Add CSS variables to :root
    let rootVariables = ':root {\n';
    if (globals) {
      if (globals.colors) {
        globals.colors.forEach(c => {
          rootVariables += `  --${c.id}: ${c.value};\n`;
        });
      }
      if (globals.fonts) {
        globals.fonts.forEach(f => {
          rootVariables += `  --${f.id}: ${f.value};\n`;
        });
      }
    }
    rootVariables += '}\n\n';
    desktopStyles += rootVariables;

    const formatRule = (selector, styles) => {
      const groups = {
        normal: {},
        hover: {},
        active: {},
        focus: {}
      };

      Object.entries(styles).forEach(([key, val]) => {
        if (key.startsWith('hover:')) {
          groups.hover[key.substring(6)] = val;
        } else if (key.startsWith('active:')) {
          groups.active[key.substring(7)] = val;
        } else if (key.startsWith('focus:')) {
          groups.focus[key.substring(6)] = val;
        } else {
          groups.normal[key] = val;
        }
      });

      let ruleStr = '';
      
      const appendGroup = (sel, groupStyles) => {
        if (Object.keys(groupStyles).length === 0) return '';
        let r = `${sel} {\n`;
        Object.entries(groupStyles).forEach(([prop, val]) => {
          r += `  ${prop}: ${val};\n`;
        });
        r += '}\n';
        return r;
      };

      ruleStr += appendGroup(selector, groups.normal);
      ruleStr += appendGroup(`${selector}:hover`, groups.hover);
      ruleStr += appendGroup(`${selector}:active`, groups.active);
      ruleStr += appendGroup(`${selector}:focus`, groups.focus);

      return ruleStr;
    };

    // 1. Compile class rules
    Object.entries(classes).forEach(([className, breakpoints]) => {
      const selector = `.${className}`;
      if (breakpoints.desktop && Object.keys(breakpoints.desktop).length > 0) {
        desktopStyles += formatRule(selector, breakpoints.desktop);
      }
      if (breakpoints.tablet && Object.keys(breakpoints.tablet).length > 0) {
        tabletStyles += formatRule(selector, breakpoints.tablet);
      }
      if (breakpoints.mobile && Object.keys(breakpoints.mobile).length > 0) {
        mobileStyles += formatRule(selector, breakpoints.mobile);
      }
    });

    // 2. Compile element specific overrides (recursive)
    const compileElementOverrides = (node) => {
      if (node.id === 'root') {
        // Output root styles directly to body tag!
        const selector = 'body';
        if (node.styles) {
          if (node.styles.desktop && Object.keys(node.styles.desktop).length > 0) {
            desktopStyles += formatRule(selector, node.styles.desktop);
          }
          if (node.styles.tablet && Object.keys(node.styles.tablet).length > 0) {
            tabletStyles += formatRule(selector, node.styles.tablet);
          }
          if (node.styles.mobile && Object.keys(node.styles.mobile).length > 0) {
            mobileStyles += formatRule(selector, node.styles.mobile);
          }
        }
      } else if (this.hasStyles(node) || (node.animations && node.animations.length > 0)) {
        const selector = `body .cwb-${node.id}`;
        if (node.styles && node.styles.desktop && Object.keys(node.styles.desktop).length > 0) {
          desktopStyles += formatRule(selector, node.styles.desktop);
        }
        if (node.styles && node.styles.tablet && Object.keys(node.styles.tablet).length > 0) {
          tabletStyles += formatRule(selector, node.styles.tablet);
        }
        if (node.styles && node.styles.mobile && Object.keys(node.styles.mobile).length > 0) {
          mobileStyles += formatRule(selector, node.styles.mobile);
        }

        // Compile element animations into class-based CSS rules
        if (node.animations && node.animations.length > 0) {
          node.animations.forEach(anim => {
            let suffix = '';
            if (anim.trigger === 'hover') suffix = ':hover';
            else if (anim.trigger === 'active') suffix = ':active';
            
            const sel = `${selector}${suffix}`;
            
            let easing = anim.ease;
            if (anim.ease === 'custom' && anim.cubicPoints) {
              easing = `cubic-bezier(${anim.cubicPoints.join(', ')})`;
            }
            
            const rule = `  animation: cwb-${anim.type} ${anim.duration}s ${easing} ${anim.delay}s ${anim.iteration} ${anim.direction || 'normal'} both;\n`;
            desktopStyles += `${sel} {\n${rule}}\n`;
          });
        }
      }

      if (node.children) {
        node.children.forEach(compileElementOverrides);
      }
    };

    compileElementOverrides(tree);

    // 3. Assemble and return stylesheet with standard breakpoints media wrappers
    let stylesheet = '/* Base Desktop Styles */\n' + desktopStyles;
    
    if (tabletStyles) {
      stylesheet += '\n/* Responsive Tablet Breakpoint */\n';
      stylesheet += `@media (max-width: 991px) {\n${tabletStyles.split('\n').map(line => '  ' + line).join('\n')}\n}\n`;
    }
    
    if (mobileStyles) {
      stylesheet += '\n/* Responsive Mobile Breakpoint */\n';
      stylesheet += `@media (max-width: 767px) {\n${mobileStyles.split('\n').map(line => '  ' + line).join('\n')}\n}\n`;
    }

    // Append predefined animations keyframes block so they run on exported page
    stylesheet += `
/* Predefined CSS Keyframes */
@keyframes cwb-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes cwb-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes cwb-slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes cwb-slide-down { from { transform: translateY(-30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes cwb-slide-left { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes cwb-slide-right { from { transform: translateX(-30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes cwb-zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes cwb-zoom-out { from { transform: scale(1.1); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes cwb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes cwb-bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-15px); }
  60% { transform: translateY(-7px); }
}
@keyframes cwb-pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 91, 255, 0.4); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(99, 91, 255, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 91, 255, 0); }
}
`;

    return stylesheet;
  }

  // Scan tree and classes recursively to find all active Google Fonts references
  static getUsedFonts(tree, classes) {
    const fonts = new Set();
    const googleFontsList = [
      'Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'Lato', 'Outfit',
      'Raleway', 'Nunito', 'Ubuntu', 'Quicksand', 'Fira Sans', 'Work Sans', 'Cabin',
      'Playfair Display', 'Merriweather', 'Lora', 'PT Serif', 'Georgia', 'Cinzel',
      'Libre Baskerville', 'Cardo', 'JetBrains Mono', 'Fira Code', 'Inconsolata',
      'Roboto Mono', 'Source Code Pro', 'Oswald', 'Anton', 'Lobster', 'Pacifico',
      'Dancing Script', 'Caveat', 'Permanent Marker', 'Righteous', 'Abril Fatface',
      'Comfortaa', 'Orbitron'
    ];

    const scanStyles = (stylesObj) => {
      if (!stylesObj) return;
      Object.values(stylesObj).forEach(bpStyles => {
        if (!bpStyles) return;
        Object.entries(bpStyles).forEach(([key, val]) => {
          const prop = key.split(':').pop();
          if (prop === 'font-family' && val) {
            const match = val.match(/'([^']+)'/) || val.match(/"([^"]+)"/);
            const fontName = match ? match[1] : val.split(',')[0].trim();
            if (googleFontsList.includes(fontName)) {
              fonts.add(fontName);
            }
          }
        });
      });
    };

    const scanNode = (node) => {
      scanStyles(node.styles);
      if (node.children) {
        node.children.forEach(scanNode);
      }
    };

    scanNode(tree);
    Object.values(classes).forEach(scanStyles);
    return fonts;
  }
}
