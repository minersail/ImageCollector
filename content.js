class ImageData {
	constructor(image)
	{
		this.url = image.src;
		this.natWidth = image.naturalWidth;
		this.natHeight = image.naturalHeight;
		this.width = image.width;
		this.height = image.height;

		this.x1 = 10;
		this.x2 = 20;
		this.y1 = 10;
		this.y2 = 20;
	}
	
	setOrigin(x, y)
	{
		this.x1 = x;
		this.x2 = x;
		this.y1 = y;
		this.y2 = y;
	}
	
	setDimensions(x, y)
	{
		this.x2 = x;
		this.y2 = y;
	}

	getTopLeft(scaled=false)
	{
		if (scaled)
			return {top: Math.min(this.y1, this.y2) / this.getScale().y, 
					left: Math.min(this.x1, this.x2) / this.getScale().x};
		else
			return {top: Math.min(this.y1, this.y2), 
					left: Math.min(this.x1, this.x2)};
	}
	
	getDimensions(scaled=false)
	{
		if (scaled)
			return {width: Math.abs(this.x1 - this.x2) / this.getScale().x,
					height: Math.abs(this.y1 - this.y2) / this.getScale().y};
		else
			return {width: Math.abs(this.x1 - this.x2),
					height: Math.abs(this.y1 - this.y2)};
	}

	getScale()
	{
		return {x: this.width / this.natWidth,
				y: this.height / this.natHeight};
	}
	
	isComplete()
	{
		if (this.url.substr(0, 5) === "data:") // Disallow png encodings to be downloaded
		{
			alert("This image has bad encoding. Please use a different image.");
			return false;
		}

		return (this.x1 !== undefined) &&
			(this.getDimensions().width != 0) &&
			(this.getDimensions().height != 0);
	}
	
	toString()
	{
		return this.url.split("/").pop().split("?")[0] + " " +
			this.getTopLeft(true).top + " " +
			this.getTopLeft(true).left + " " +
			this.getDimensions(true).width + " " +
			this.getDimensions(true).height;
	}
}

let images = [];
let final_images = [];
let lastImageData = null;
let highlighting = false;

$(document).mousemove(function(e)
{
	let img = $("img:hover");
	if (img.length == 0) return; // We are not over an image

	let url = img.get(0).src;		
	let image = getImage(final_images, url);

	if (image === null) // ImageData was not finalized
	{			
		image = getImage(images, url) || images[images.push(new ImageData(img.get(0))) - 1];

		if (e.shiftKey)
		{
			let posX = e.pageX - img.offset().left;
			let posY = e.pageY - img.offset().top;

			if (!highlighting)
			{
				image.setOrigin(posX, posY);
				highlighting = true;
			}
			image.setDimensions(posX, posY);
		}
		else
		{
			highlighting = false;
		}
		
		$(".highlight").css("border-color", "red");
	}
	else
	{
		$(".highlight").css("border-color", "green");
	}

	syncHighlight(image, img);
});

$(document).keydown(function(e) 
{		
	let E = 69;
	let R = 82;
	let D = 68;
	
	if (e.keyCode == E && lastImageData !== null && lastImageData.isComplete())
	{
		final_images.push(lastImageData);
		$(".highlight").css("border-color", "green");
	}
	else if (e.keyCode == R && lastImageData !== null &&
			 getImage(final_images, lastImageData.url) !== null)
	{
		removeImage(final_images, lastImageData.url);
		$(".highlight").css("border-color", "red");
	}
	else if (e.keyCode == D)
	{
		downloadAll();
	}
});

function syncHighlight(imageData, image)
{	
	let left = image.offset().left,
		top = image.offset().top;
	
	let width = imageData.getDimensions().width;
	let height = imageData.getDimensions().height;
	
	$(".highlight").css("left", imageData.getTopLeft().left + left);
	$(".highlight").css("top", imageData.getTopLeft().top + top);
	$(".highlight").css("width", width);
	$(".highlight").css("height", height);
	
	lastImageData = imageData;
}

function getImage(arr, url)
{
	for (let i = 0; i < arr.length; i++)
	{
		if (arr[i].url == url)
		{
			return arr[i];
		}
	}
	return null;
}

function removeImage(arr, url)
{
	for (let i = 0; i < arr.length; i++)
	{
		if (arr[i].url == url)
		{
			arr.splice(i, 1);
		}
	}
}

function downloadAll()
{
	let zip = new JSZip();
	
	for (let i = 0; i < final_images.length; i++)
	{
		let image = final_images[i];
		
		zip.file(image.url.split("/").pop().split("?")[0], urlToPromise(image.url.split("?")[0]), {binary: true});
	}
	
	zip.file("matrices.txt", final_images.join("\n"));         
	zip.generateAsync({type:"blob"}).then(function(content)
	{
		saveAs(content, "images.zip"); 
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
	$("body").append('<div class="highlight"></div>');
	$(".highlight").css("position", "absolute");
	$(".highlight").css("border", "1px solid red");
	$(".highlight").css("pointer-events", "none");
	$(".highlight").css("z-index", 1000);
});