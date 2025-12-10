from setuptools import setup, find_packages

setup(
    name="wakanda-common",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "sqlalchemy==2.0.23",
        "asyncpg==0.29.0"
    ]
)