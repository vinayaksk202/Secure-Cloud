from PIL import Image
import imagehash
import io

def get_image_hash(image_bytes):

    img = Image.open(io.BytesIO(image_bytes))

    phash = str(imagehash.phash(img))

    return phash


def get_image_resolution(image_bytes):

    img = Image.open(io.BytesIO(image_bytes))

    return img.width * img.height