"""
Open Research Community Accelorator
Vermont Data App

DataFrame Analysis Utility Functions
"""


def get_columns(df):
    """
    Get the column names from the DataFrame as a list.

    @param df: A pandas DataFrame object.
    @return: A list of column names in the dataframe (string).
    """
    columns = df.columns.tolist()
    return columns


def get_column_type(df, column_name):
    """
    Get the data type of a specific column in the DataFrame.

    @param df: A pandas Dataframe object.
    @param column_name: The name of the column in the dataframe (string).
    @return: The pandas data type of the column (dtype).
    """
    column_type = df[column_name].dtype
    return column_type


def get_dimensions(df):
    """
    Determines the numnber of rows and columns in the dataset.

    @param df: A pandas DataFrame object.
    @return: Number of columns (int), Number of rows (int) respectfully.
    """

    # Find the number of columns
    num_columns = len(get_columns(df))
    # Find the number of rows
    num_rows = len(df)

    # Return the dimensions as a tuple
    return num_columns, num_rows


def get_skew(df, variable):
    """
    Computes the sample skewness of a numeric variable in a DataFrame.

    @param df: A pandas DataFrame object.
    @param variable: The column name of the numeric variable (string).
    @return: The computed skewness metric (float).
    """
    import numpy as np

    x = df[variable].dropna()
    n = len(x)
    if n < 3:
        return np.nan  # skewness not defined for < 3 values

    mean = x.mean()
    std = x.std(ddof=0)  # population std for formula

    skewness = ((x - mean) ** 3).sum() / (n * (std**3))

    return skewness
