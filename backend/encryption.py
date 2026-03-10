import hashlib
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.fernet import Fernet
import os

# Generate RSA keys (Run only once)
def generate_keys():
    if not os.path.exists("private.pem"):

        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )

        public_key = private_key.public_key()

        with open("private.pem", "wb") as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))

        with open("public.pem", "wb") as f:
            f.write(public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ))

generate_keys()


def sha256_hash(data):
    return hashlib.sha256(data).hexdigest()


def hybrid_encrypt(data):

    # AES key
    aes_key = Fernet.generate_key()
    f = Fernet(aes_key)
    encrypted_data = f.encrypt(data)

    # Load public key
    with open("public.pem", "rb") as f:
        public_key = serialization.load_pem_public_key(f.read())

    encrypted_aes_key = public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    return encrypted_data, encrypted_aes_key
def hybrid_decrypt(encrypted_data, encrypted_key_value):

    # Load private RSA key
    with open("private.pem", "rb") as f:
        private_key = serialization.load_pem_private_key(
            f.read(),
            password=None
        )

    # 🔥 HANDLE ALL POSSIBLE TYPES

    if isinstance(encrypted_key_value, str):
        # Stored as hex string
        encrypted_key = bytes.fromhex(encrypted_key_value)

    elif isinstance(encrypted_key_value, bytes):
        try:
            # Try decoding as hex string
            encrypted_key = bytes.fromhex(encrypted_key_value.decode())
        except:
            # If not hex, assume already raw bytes
            encrypted_key = encrypted_key_value

    else:
        raise Exception("Invalid encrypted key format")

    # Decrypt AES key using RSA
    aes_key = private_key.decrypt(
        encrypted_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    # Decrypt file using AES
    fernet = Fernet(aes_key)
    decrypted_data = fernet.decrypt(encrypted_data)

    return decrypted_data
