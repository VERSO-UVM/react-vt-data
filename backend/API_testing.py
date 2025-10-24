from endpoints import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_get_zoning_data():
    response = client.get("/load/mapping/zoning")
    assert response.status_code == 200
    data = response.json()
    return data


def test_get_flooding_data():
    response = client.get("/load/mapping/flood_legal")
    assert response.status_code == 200
    data = response.json()
    return data


def test_get_soil_septic_data():
    response = client.get("/load/mapping/soil_septic")
    assert response.status_code == 200
    data = response.json()
    return data


def test_get_census_data_main(category, filter_dict):
    response = client.post(
        f"/load/census/{category}", json={"filter_dict": filter_dict})
    print(response.status_code, response.text)
    assert response.status_code == 200
    data = response.json()
    return data


def test_get_census_data_subcat(category, subcategory, filter_dict):
    response = client.post(
        f"/load/census/{category}/{subcategory}", json={"filter_dict": filter_dict})
    print(response.status_code, response.text)
    assert response.status_code == 200
    data = response.json()
    return data


def main():
    filter_dict_example = {
        "Jurisdiction": "Addison town",
        "year": "2021",
        "variable": "DP03_0092"
    }
    data = test_get_census_data_subcat(
        category="economic", subcategory="median_earnings", filter_dict=filter_dict_example)

    print(data)


if __name__ == "__main__":
    main()
