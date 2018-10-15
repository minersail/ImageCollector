class ImageSelection {
	constructor(p1x, p1y, p2x, p2y)
	{
		this.p1 = {x: p1x, y: p1y};
		this.p2 = {x: p2x, y: p2y};
	}

	getTopLeft()
	{
		return {top: Math.min(this.p1.y, this.p2.y), 
				left: Math.min(this.p1.x, this.p2.x)};
	}
	
	getDimensions()
	{
		return {width: Math.abs(this.p1.x - this.p2.x),
				height: Math.abs(this.p1.y - this.p2.y)};
	}

	setOrigin(x, y)
	{
		this.p1.x = x;
		this.p1.y = y;
	}

	setPoint2(x, y)
	{
		this.p2.x = x;
		this.p2.y = y;
	}
}

class ImageData {
	constructor(image)
	{
		this.url = image.src;
		this.scale = {x: (image.width / image.naturalWidth), 
					  y: (image.height / image.naturalHeight)};

		this.selections = [new ImageSelection(10, 10, 20, 20)];
	}
	
	getSelection()
	{
		return this.selections[this.selections.length - 1];
	}

	addSelection()
	{
		this.selections.push(new ImageSelection(10, 10, 20, 20));
	}

	removeSelection()
	{
		this.selections.pop();
	}
	
	toString()
	{
		let str = this.url.split("/").pop().split("?")[0] + " ";

		for (let i = 0; i < this.selections.length; i++)
		{
			str = str + 
				(this.selections[i].getTopLeft().top / this.scale.y) + " " +
				(this.selections[i].getTopLeft().left / this.scale.x) + " " +
				(this.selections[i].getDimensions().width / this.scale.x) + " " +
				(this.selections[i].getDimensions().height / this.scale.y) + "\n";
		}

		return str;
	}
}

let images = [];
let final_images = [];
let currData = null;
let currImg = null; // only used once to highlight image on button press - kinda hacky tbh
let highlighting = false;

let MAX_SELECT = 10;

// Bitmask set up (0/1) - display none/block, border dashed/solid, color red/green
let NONE = 0b000;
let ACTIVE = 0b100;
let SELECTED = 0b110;
let SAVED = 0b111;

$(document).mousemove(function(e)
{
	let img = $("img:hover");
	if (img.length == 0) return; // We are not over an image

	let url = img.get(0).src;
	let imageData = getImageData(final_images, url);

	if (imageData === null)
	{
		imageData = getImageData(images, url) || images[images.push(new ImageData(img.get(0))) - 1];

		if (e.shiftKey && imageData.selections.length <= MAX_SELECT)
		{			
			if (url.substr(0, 5) === "data:") // Disallow png encodings to be downloaded
			{
				alert("This image has bad encoding. Please use a different image.");
				return;
			}

			// posX and posY are cursor's position relative to image
			let posX = e.pageX - img.offset().left;
			let posY = e.pageY - img.offset().top;

			if (!highlighting)
			{
				imageData.getSelection().setOrigin(posX, posY);
				highlighting = true;
			}
			imageData.getSelection().setPoint2(posX, posY);
		}
		else
		{
			highlighting = false;
		}
	}

	syncHighlight(imageData, img);
});

$(document).keydown(function(e) 
{		
	if (currData === null) return;

	let A = 65;
	let D = 68;
	let R = 82;
	let S = 83;

	let image_saved = getImageData(final_images, currData.url) !== null;
	
	if (e.keyCode == A && !image_saved && currData.selections.length <= MAX_SELECT) // Add
	{
		currData.addSelection();
	}
	if (e.keyCode == S) // Toggle Save
	{
		if (currData.url.substr(0, 5) === "data:") // Disallow png encodings to be downloaded
		{
			alert("This image has bad encoding. Please use a different image.");
			return;
		}

		if (!image_saved) // Save
			final_images.push(currData);
		else
			removeImageData(final_images, currData.url);
	}
	else if (e.keyCode == R && !image_saved && currData.selections.length > 1) // Remove
	{
		currData.removeSelection();
	}
	else if (e.keyCode == D) // Download
	{
		downloadAll();
	}

	syncHighlight(currData, currImage)
});

function syncHighlight(imageData, image)
{	
	let left = image.offset().left,
		top = image.offset().top;

	for (let i = 0; i < MAX_SELECT; i++)
	{
		if (i >= imageData.selections.length)
		{
			highlightSetMode(i, NONE);
		}
		else
		{
			let selection = imageData.selections[i];

			let selLeft = selection.getTopLeft().left + left;
			let selTop = selection.getTopLeft().top + top;
			let selWidth = selection.getDimensions().width;
			let selHeight = selection.getDimensions().height;

			highlightSetSize(i, selLeft, selTop, selWidth, selHeight);

			if (getImageData(final_images, imageData.url) === null) // Image not saved
			{
				highlightSetMode(i, SELECTED);

				if (i === imageData.selections.length - 1)
				{
					highlightSetMode(i, ACTIVE);
				}
			}
			else
			{
				highlightSetMode(i, SAVED);
			}
		}
	}

	currData = imageData;
	currImage = image;
}

function highlightSetSize(index, left, top, width, height) // Zero-indexed
{
	let highlight = $(".highlight div:nth-child(" + (index + 1) + ")");

	highlight.css("left", left);
	highlight.css("top", top);
	highlight.css("width", width);
	highlight.css("height", height);
}

function highlightSetMode(index, mode)
{
	let highlight = $(".highlight div:nth-child(" + (index + 1) + ")");

	let DISPL_BIT = (mode & 0b100) != 0;
	let STYLE_BIT = (mode & 0b010) != 0;
	let COLOR_BIT = (mode & 0b001) != 0;

	highlight.css("display", DISPL_BIT ? "block" : "none");
	highlight.css("border-style", STYLE_BIT ? "solid" : "dashed");
	highlight.css("border-color", COLOR_BIT ? "green" : "red");
}

function getImageData(arr, url)
{
	for (let i = 0; i < arr.length; i++)
	{
		if (arr[i].url === url)
		{
			return arr[i];
		}
	}
	return null;
}

function removeImageData(arr, url)
{
	for (let i = 0; i < arr.length; i++)
	{
		if (arr[i].url === url)
		{
			arr.splice(i, 1);
			return;
		}
	}
}

function downloadAll()
{
	let zip = new JSZip();
	let matrices = "";
	// Create a list of promises from the imageDatas.
	let promises = final_images.map(image => urlToPromise(image.url.split("?")[0]));

	// Map all promises that throw errors to return the error
	Promise.all(promises.map(p => p.catch(e => e))).then(function(results)
	{
		results.forEach(function(result, i)
		{
			// Filter out errors
			if (!(result instanceof Error))
			{
				zip.file(final_images[i].url.split("/").pop().split("?")[0], result, {binary: true});
				matrices += final_images[i];
				console.info(final_images[i].url);
			}
			else
			{
				console.warn("Unable to load " + final_images[i].url + ".");
			}
		});

		zip.file("matrices.txt", matrices);         
		zip.generateAsync({type:"blob"}).then(function(content)
		{
			saveAs(content, "images.zip"); 
		});
	});	
}

function urlToPromise(url) {
	return new Promise(function(resolve, reject) {
		JSZipUtils.getBinaryContent(url, function (err, data) {
			if(err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}

$(document).ready(function()
{
	var css = document.createElement("style");
	css.type = "text/css";
	css.innerHTML = ".highlight * { position: absolute; border: 1px dashed red; pointer-events: none; z-index: 1000; }";
	document.body.appendChild(css);

	$("body").append('<div class="highlight"></div>');

	for (let i = 0; i < MAX_SELECT; i++)
		$(".highlight").append('<div></div>');
});