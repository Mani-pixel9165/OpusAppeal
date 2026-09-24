def resolve_temporary_password(username, password=None):
    if password:
        return password

    base = "".join(username.split()).lower()
    return f"{base}@123"
